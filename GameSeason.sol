// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

interface IStaking { function releaseCollateral(address user) external; }
interface IFIM { function burn(address from, uint256 amount) external; }
interface IExchange { function openSettlement() external; }
interface ITreasury {
    function harvestAndExecutePolicy() external;
    function payWinner(address winner, uint256 amount) external;
    function usdc() external view returns (address);
    function getSeasonPoolSize(address season) external view returns (uint256);
    function daoRecipient() external view returns (address);
    function sweepSeasonPrincipal(address season, address to) external;
}
interface IAuction { function auctionEndTime() external view returns (uint256); }

contract GameSeason is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;
    using SafeCast for int256;

    struct SeasonConfig {
        uint256 auctionStartTime;
        uint256 auctionDuration;
        uint256 tradingDuration;
        uint256 victoryThresholdBps;
        uint256 baseMultiplierBps;
        uint256 buybackBps;
        uint256 liquidityBps;
        uint256 prizePoolBps;
        uint256 daoBps;
        uint256 existentialThresholdFim;
    }

    enum State { BOOTSTRAP, ACTIVE, CALCULATING, DISTRIBUTION }
    State public currentState;

    IERC20 public immutable usdc;
    address public immutable treasury;
    address public immutable staking;

    uint256 public immutable auctionStartTime;
    uint256 public immutable auctionDuration;
    uint256 public immutable tradingDuration;
    uint256 public immutable victoryThresholdBps;
    uint256 public immutable baseMultiplierBps;
    uint256 public immutable buybackBps;
    uint256 public immutable liquidityBps;
    uint256 public immutable prizePoolBps;
    uint256 public immutable daoBps;
    uint256 public immutable existentialThresholdFim;
    uint256 public immutable bondAmountUsdc;

    address public auction;
    address public exchange;
    address public fim;
    uint256 public tradingStartTime;
    uint256 public distributionStartTime;

    mapping(address => uint256) public fimBalances;
    mapping(address => int256) public netContributions;
    mapping(address => bool) public hasClaimed;

    // Pool size snapshotted at finalizeGame; denominator for lazy per-player payout.
    uint256 public finalPoolSize;

    address[] public players;
    mapping(address => bool) public isIndexed;
    uint256 public totalSupply;

    // Batch processing state
    uint256 public g_initial;
    uint256 public g_current;
    uint256 public processedCount;
    uint256 public accumulatedSupply;
    uint256 public regAccumulator;
    uint256 public lastBalanceSeen;
    uint256 public effectivePopulation;

    // Outcome state
    uint256 public massThresholdBalance;
    uint256 public winningCoalitionSupply;
    uint256 public effectiveSocialistSupply;
    // Sum of positive net contributions over qualifying players, used to weight
    // the Solidarity Fund redistribution on a Socialist win (Proof of Sacrifice).
    // NOTE: wash-trading mitigation (M2) is intentionally deferred — see audit notes.
    uint256 public totalPositiveNetContribution;

    bool public isOligarchyWin;
    bool public isDraw;
    uint256 public finalProgressBps;

    address public settlementStarter;

    // Per-round duplicate tracking for processBatch
    uint256 private _processingRound;
    mapping(uint256 => mapping(address => bool)) private _processedInRound;

    event StateChanged(State newState);
    event VictoryDeclared(bool isOligarchyWin, uint256 progressBps, bool isTimeLimit);
    event LedgerUpdated(address indexed buyer, address indexed seller, uint256 fimAmount, uint256 usdcAmount);
    event PlayerSeasonStatsFinalized(
        address indexed user,
        uint256 totalPotentialPayoutUSDC,
        int256 netContributions,
        uint256 fimBalances
    );
    event PayoutClaimed(address indexed user, uint256 amount);

    constructor(
        address _treasury,
        address _staking,
        uint256 _auctionDuration,
        uint256 _tradingDuration,
        uint256 _threshold,
        uint256 _baseMultiplierBps,
        uint256 _buyback,
        uint256 _liquidity,
        uint256 _reinvest,
        uint256 _dao,
        uint256 _existentialThresholdFim,
        uint256 _bondAmountUsdc
    ) Ownable(msg.sender) {
        treasury = _treasury;
        staking = _staking;

        auctionStartTime = block.timestamp;
        auctionDuration = _auctionDuration;
        tradingDuration = _tradingDuration;
        victoryThresholdBps = _threshold;
        baseMultiplierBps = _baseMultiplierBps;
        buybackBps = _buyback;
        liquidityBps = _liquidity;
        prizePoolBps = _reinvest;
        daoBps = _dao;
        existentialThresholdFim = _existentialThresholdFim;
        bondAmountUsdc = _bondAmountUsdc;

        usdc = IERC20(ITreasury(_treasury).usdc());
        currentState = State.BOOTSTRAP;
    }

    function setAuction(address _auction) external onlyOwner {
        require(auction == address(0), "Linked");
        auction = _auction;
    }

    function setExchange(address _exchange) external onlyOwner {
        require(exchange == address(0), "Linked");
        exchange = _exchange;
    }

    function setFim(address _fim) external onlyOwner {
        require(fim == address(0), "Linked");
        fim = _fim;
    }

    function isActive() external view returns (bool) {
        return currentState == State.ACTIVE && block.timestamp < tradingStartTime + tradingDuration;
    }

    function getConfig() external view returns (SeasonConfig memory) {
        return SeasonConfig({
            auctionStartTime: auctionStartTime,
            auctionDuration: auctionDuration,
            tradingDuration: tradingDuration,
            victoryThresholdBps: victoryThresholdBps,
            baseMultiplierBps: baseMultiplierBps,
            buybackBps: buybackBps,
            liquidityBps: liquidityBps,
            prizePoolBps: prizePoolBps,
            daoBps: daoBps,
            existentialThresholdFim: existentialThresholdFim
        });
    }

    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }

    function getPhase() public view returns (string memory) {
        if (currentState == State.BOOTSTRAP) {
            if (auction != address(0) && block.timestamp < IAuction(auction).auctionEndTime()) return "AUCTION";
            return "BOOTSTRAP";
        }
        if (currentState == State.ACTIVE) return "TRADING";
        if (currentState == State.CALCULATING) return "SETTLING";
        return "PAYOUT";
    }

    function updateLedger(address b, address s, uint256 f, uint256 u) external {
        require(msg.sender == auction || msg.sender == exchange, "Auth");

        if (b != address(0) && !isIndexed[b]) { players.push(b); isIndexed[b] = true; }
        if (s != address(0) && !isIndexed[s]) { players.push(s); isIndexed[s] = true; }

        if (s == address(0)) {
            fimBalances[b] += f; totalSupply += f;
            netContributions[b] += u.toInt256();
        } else {
            fimBalances[s] -= f; fimBalances[b] += f;
            netContributions[b] += u.toInt256();
            netContributions[s] -= u.toInt256();
        }
        emit LedgerUpdated(b, s, f, u);
    }

    // --- SETTLEMENT FLOW ---

    function startBootstrap() external nonReentrant {
        require(currentState == State.BOOTSTRAP, "Wrong State");
        require(settlementStarter == address(0), "Already started");
        require(auction != address(0) && block.timestamp >= IAuction(auction).auctionEndTime(), "Auction live");

        usdc.safeTransferFrom(msg.sender, address(this), bondAmountUsdc);
        settlementStarter = msg.sender;
        _resetBatch();
        emit StateChanged(State.BOOTSTRAP);
    }

    function startSettlement() external nonReentrant {
        require(currentState == State.ACTIVE, "Wrong State");
        usdc.safeTransferFrom(msg.sender, address(this), bondAmountUsdc);
        currentState = State.CALCULATING;
        settlementStarter = msg.sender;
        _resetBatch();
    }

    function _resetBatch() internal {
        processedCount = 0;
        accumulatedSupply = 0;
        regAccumulator = 0;
        lastBalanceSeen = 0;
        effectivePopulation = 0;
        winningCoalitionSupply = 0;
        effectiveSocialistSupply = 0;
        totalPositiveNetContribution = 0;
        _processingRound++;
    }

    function processBatch(address[] calldata pList) external nonReentrant {
        require(settlementStarter != address(0), "No starter");
        require(msg.sender == settlementStarter, "Only starter");
        require(currentState == State.BOOTSTRAP || currentState == State.CALCULATING, "Wrong phase");

        uint256 _accumSup = accumulatedSupply;
        uint256 _regAcc = regAccumulator;
        uint256 _effPop = effectivePopulation;
        uint256 _lastBal = lastBalanceSeen;
        uint256 _massThreshold = massThresholdBalance;
        uint256 _winColSup = winningCoalitionSupply;
        uint256 _effSocSup = effectiveSocialistSupply;
        uint256 _totalCPos = totalPositiveNetContribution;
        uint256 _totalSup = totalSupply;
        uint256 _round = _processingRound;

        for (uint i = 0; i < pList.length; i++) {
            address p = pList[i];
            require(isIndexed[p], "Unknown player");

            uint256 bal = fimBalances[p];
            require(bal >= _lastBal, "Unsorted");
            require(!_processedInRound[_round][p], "Duplicate player");
            _processedInRound[_round][p] = true;
            _lastBal = bal;

            if (bal >= existentialThresholdFim) {
                _effPop++;
                _accumSup += bal;
                unchecked { _regAcc += _effPop * bal; }

                if (_accumSup <= _totalSup / 2) {
                    _massThreshold = bal;
                } else if (currentState == State.CALCULATING) {
                    _winColSup += bal;
                }

                if (currentState == State.CALCULATING) {
                    uint256 capped = bal > _massThreshold ? _massThreshold : bal;
                    _effSocSup += capped;

                    int256 c = netContributions[p];
                    if (c > 0) _totalCPos += c.toUint256();
                }
            }
        }

        processedCount += pList.length;
        accumulatedSupply = _accumSup;
        regAccumulator = _regAcc;
        effectivePopulation = _effPop;
        lastBalanceSeen = _lastBal;
        massThresholdBalance = _massThreshold;
        winningCoalitionSupply = _winColSup;
        effectiveSocialistSupply = _effSocSup;
        totalPositiveNetContribution = _totalCPos;
    }

    function finalizeBootstrap() external nonReentrant {
        require(currentState == State.BOOTSTRAP);
        require(processedCount == players.length, "Incomplete");

        g_initial = _calculateReg();
        currentState = State.ACTIVE;
        tradingStartTime = block.timestamp;

        address starter = settlementStarter;
        settlementStarter = address(0);
        usdc.safeTransfer(starter, bondAmountUsdc);
        emit StateChanged(State.ACTIVE);
    }

    /**
     * @notice Council rescue: reset a stuck/poisoned settlement batch and (re)assign
     *         the starter. Recovers a season where the current starter abandoned a
     *         partially-processed sorted batch in BOOTSTRAP/CALCULATING. The bond held
     *         is refunded to whoever finalizes next; the abandoning starter forfeits it.
     */
    function resetSettlement(address newStarter) external onlyOwner {
        require(currentState == State.BOOTSTRAP || currentState == State.CALCULATING, "Wrong phase");
        require(newStarter != address(0), "Zero starter");
        _resetBatch();
        settlementStarter = newStarter;
    }

    function finalizeGame() external nonReentrant {
        require(currentState == State.CALCULATING);
        require(processedCount == players.length, "Incomplete");

        g_current = _calculateReg();

        uint256 oneMinusGi = 10000 - g_initial;
        uint256 M = baseMultiplierBps + ((oneMinusGi * oneMinusGi) / 10000);

        uint256 capProgress = (g_current > g_initial && oneMinusGi > 0)
            ? ((g_current - g_initial) * 10000) / oneMinusGi
            : 0;

        uint256 socProgress = (g_current < g_initial && g_initial > 0)
            ? ((g_initial - g_current) * M) / g_initial
            : 0;

        bool timeExpired = block.timestamp >= tradingStartTime + tradingDuration;

        if (capProgress >= victoryThresholdBps || socProgress >= victoryThresholdBps || timeExpired) {
            isOligarchyWin = (capProgress >= socProgress);
            isDraw = timeExpired && capProgress < victoryThresholdBps && socProgress < victoryThresholdBps;

            uint256 maxProg = capProgress > socProgress ? capProgress : socProgress;
            finalProgressBps = (maxProg * 10000) / victoryThresholdBps;

            // O(1): flip the Exchange into paginated-settlement mode instead of
            // looping every open order inline (gas-bomb DoS).
            if (exchange != address(0)) IExchange(exchange).openSettlement();
            currentState = State.DISTRIBUTION;
            distributionStartTime = block.timestamp;

            address starter = settlementStarter;
            settlementStarter = address(0);
            usdc.safeTransfer(starter, bondAmountUsdc);

            ITreasury(treasury).harvestAndExecutePolicy();
            // Snapshot the pool; each player computes & pulls their own payout lazily
            // in claimPayout (O(1)) rather than a single unbounded loop here.
            finalPoolSize = ITreasury(treasury).getSeasonPoolSize(address(this));

            emit VictoryDeclared(isOligarchyWin, finalProgressBps, isDraw);
        } else {
            currentState = State.ACTIVE;
            settlementStarter = address(0);
            // Forfeited bond goes to the DAO, not the Treasury USDC balance, so it is
            // never miscounted as Aave yield by the next harvest.
            usdc.safeTransfer(ITreasury(treasury).daoRecipient(), bondAmountUsdc);
            emit StateChanged(State.ACTIVE);
        }
    }

    function _calculateReg() internal view returns (uint256) {
        if (accumulatedSupply == 0 || effectivePopulation == 0) return 0;
        uint256 term1 = (2 * regAccumulator * 10000) / (effectivePopulation * accumulatedSupply);
        uint256 term2 = ((effectivePopulation + 1) * 10000) / effectivePopulation;
        uint256 g = term1 > term2 ? term1 - term2 : 0;
        // Gini is mathematically < 1 (10000 bps); clamp so rounding overshoot can
        // never make `10000 - g_initial` underflow and brick finalizeGame.
        return g > 10000 ? 10000 : g;
    }

    function _calculateSinglePayout(uint256 bal, int256 netContrib, uint256 poolSize) internal view returns (uint256) {
        uint256 winShare = 0;

        if (isOligarchyWin) {
            if (bal > massThresholdBalance && winningCoalitionSupply > 0) {
                winShare = (poolSize * bal) / winningCoalitionSupply;
            }
        } else if (accumulatedSupply > 0) {
            // Base entitlement: each player's pool share, capped at the top-of-Masses balance.
            uint256 capBal = bal > massThresholdBalance ? massThresholdBalance : bal;
            uint256 base = (poolSize * capBal) / accumulatedSupply;

            // Solidarity Fund: the pool value confiscated from the Elite (everything
            // above the per-player cap), redistributed by Proof of Sacrifice — each
            // player's positive Net Contribution (bought expensive / sold cheap for the
            // cause). If nobody has a positive net contribution, fall back to capped-
            // balance weighting, which reduces exactly to flat pro-rata of capped holdings.
            uint256 solidarityFund = (poolSize * (accumulatedSupply - effectiveSocialistSupply)) / accumulatedSupply;
            uint256 solidarityShare;
            if (totalPositiveNetContribution > 0) {
                uint256 cPos = netContrib > 0 ? netContrib.toUint256() : 0;
                solidarityShare = (solidarityFund * cPos) / totalPositiveNetContribution;
            } else if (effectiveSocialistSupply > 0) {
                solidarityShare = (solidarityFund * capBal) / effectiveSocialistSupply;
            }

            winShare = base + solidarityShare;
        }

        uint256 drawShare = accumulatedSupply > 0 ? (poolSize * bal) / accumulatedSupply : 0;

        uint256 progressCapped = finalProgressBps > 10000 ? 10000 : finalProgressBps;
        return (winShare * progressCapped / 10000) + (drawShare * (10000 - progressCapped) / 10000);
    }

    /**
     * @notice The USDC a player would receive from claimPayout right now. For UI
     *         display before claiming. Returns 0 before settlement, for already-claimed
     *         players, and for players below the existential (dust) threshold.
     */
    function computePayout(address player) external view returns (uint256) {
        if (currentState != State.DISTRIBUTION || hasClaimed[player]) return 0;
        uint256 bal = fimBalances[player];
        if (bal < existentialThresholdFim) return 0;
        return _calculateSinglePayout(bal, netContributions[player], finalPoolSize);
    }

    function claimPayout() external nonReentrant {
        require(currentState == State.DISTRIBUTION, "Phase");
        require(isIndexed[msg.sender], "Not a player");
        require(!hasClaimed[msg.sender], "Claimed");
        hasClaimed[msg.sender] = true;

        uint256 bal = fimBalances[msg.sender];
        int256 netContrib = netContributions[msg.sender];

        // Lazy per-player payout: O(1), derived from the finalized aggregates.
        uint256 payout = 0;
        if (bal >= existentialThresholdFim) {
            payout = _calculateSinglePayout(bal, netContrib, finalPoolSize);
        }

        // Effects before interactions (CEI).
        fimBalances[msg.sender] = 0;

        // Always release collateral — even on a zero payout — so no player's staked
        // RGD can be stranded by an ended season. (Players with FIM still escrowed in
        // open Exchange orders must have those orders settled first, else burn reverts.)
        IStaking(staking).releaseCollateral(msg.sender);

        if (bal > 0 && fim != address(0)) IFIM(fim).burn(msg.sender, bal);

        if (payout > 0) {
            ITreasury(treasury).payWinner(msg.sender, payout);
        }

        emit PlayerSeasonStatsFinalized(msg.sender, payout, netContrib, bal);
        emit PayoutClaimed(msg.sender, payout);
    }

    function sweepUnclaimed(address to) external onlyOwner {
        require(currentState == State.DISTRIBUTION, "Wrong State");
        require(block.timestamp >= distributionStartTime + 365 days, "Too early");
        require(to != address(0), "zero address");
        ITreasury(treasury).sweepSeasonPrincipal(address(this), to);
    }
}
