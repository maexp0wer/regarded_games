// components/DiagramIcon.tsx
import React, { SVGProps } from 'react';
import OwnershipTokenBox from './OwnershipTokenBox'; // Adjust path
import SendButton from './SendButton';             // Adjust path

// Optional: If using CSS Modules for the main diagram styles
// import styles from './DiagramStyles.module.css';

type DiagramIconProps = SVGProps<SVGSVGElement>;

const DiagramIcon = ({ className, ...rest }: DiagramIconProps) => {
  const componentClassName = `diagram-svg ${className || ''}`.trim();

  return (
    <svg
      viewBox="653 177 595 504"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      overflow="hidden"
      className={componentClassName}
      {...rest}
    >
      <g>
        {/* --- Render ALL other elements FIRST --- */}

        {/* --- Render elements that should be underneath first --- */}

        {/* Backgrounds and Titles (with rounded corners) */}
        <rect x="654" y="384" width="428" height="89" rx="8" className="rect-minter-box"/>
        <text transform="translate(779.306 465)" className="text-minter-title">Ownership Token Minter</text>
        <text transform="translate(955.972 465)" className="text-empty"></text>
        <rect x="714" y="178" width="172" height="118" rx="8" className="rect-seller-box"/>
        <text transform="translate(778.617 198)" className="text-seller-title">Seller</text>
        <text transform="translate(820.95 198)" className="text-empty"></text>
        <rect x="717" y="557" width="171" height="118" rx="8" className="rect-aigenheim-box"/>
        <text transform="translate(746.739 577)" className="text-aigenheim-title-1">Aigenheim</text>
        <text transform="translate(823.573 577)" className="text-empty"></text>
        <text transform="translate(827.073 577)" className="text-aigenheim-title-2">DAO</text>
        <text transform="translate(858.073 577)" className="text-empty"></text>
        <rect x="1051" y="177" width="196" height="119" rx="8" className="rect-listing-box"/>
        <text transform="translate(1091.06 288)" className="text-listing-title">Property Listing</text>
        <text transform="translate(1207.06 288)" className="text-empty"></text>
        <rect x="1075" y="561" width="172" height="119" rx="8" className="rect-owner-box"/>
        <text transform="translate(1137.15 582)" className="text-owner-title">Owner</text>
        <text transform="translate(1185.32 582)" className="text-empty"></text>

        {/* Buttons (including reusable SendButtons) (with rounded corners) */}
        <rect x="681" y="401" width="135" height="38" rx="8" className="rect-request-button"/>
        <text transform="translate(718.605 422)" className="text-request-label">Request</text>
        <text transform="translate(778.438 422)" className="text-empty"></text>
        <SendButton x={718} y={323} />
        <SendButton x={860} y={323} />
        <SendButton x={860} y={496} />
        <rect x="842" y="401" width="218" height="37" rx="8" className="rect-mint-button"/>
        <text transform="translate(870.624 422)" className="text-mint-label">Mint Ownership Token</text>
        <text transform="translate(1032.29 422)" className="text-empty"></text>
        <text transform="translate(951.458 441)" className="text-empty"></text>
        <rect x="718" y="496" width="90" height="34" rx="8" className="rect-approve-button"/>
        <text transform="translate(732.576 517)" className="text-approve-label">Approve</text>
        <text transform="translate(793.41 517)" className="text-empty"></text>
        <rect x="922" y="195" width="90" height="34" rx="8" className="rect-create-button"/>
        <text transform="translate(943.417 216)" className="text-create-label">Create</text>
        <text transform="translate(991.084 216)" className="text-empty"></text>
        <rect x="922" y="250" width="91" height="33" rx="8" className="rect-sell-button-1"/>
        <text transform="translate(953.712 270)" className="text-sell-label-1">Sell</text>
        <text transform="translate(981.046 270)" className="text-empty"></text>
        <rect x="1145" y="384" width="102" height="34" rx="8" className="rect-buy-sell-button"/>
        <text transform="translate(1158.81 405)" className="text-buy-sell-label">Buy & Sell</text>
        <text transform="translate(1232.81 405)" className="text-empty"></text>
        <rect x="1075" y="496" width="91" height="34" rx="8" className="rect-modify-button"/>
        <text transform="translate(1095.13 517)" className="text-modify-label">Modify</text>
        <text transform="translate(1145.97 517)" className="text-empty"></text>

        {/* *** PATHS RESTORED HERE *** */}
        <path d="M0.394373-0.537507 31.8098 22.5122 31.0211 23.5873-0.394373 0.537507ZM32.7067 19.036 36.7906 26.9935 27.9742 25.4861Z" transform="matrix(-1 0 0 1 800.291 296.5)" className="path-arrow"/>
        <path d="M0.634009-0.2061 13.0446 37.9717 11.7766 38.3839-0.634009 0.2061ZM15.8025 35.6732 14.4716 44.5179 8.19435 38.1464Z" transform="matrix(-1 0 0 1 763.972 357.5)" className="path-arrow"/>
        <path d="M818.5 419.833 836.363 419.833 836.363 421.167 819.5 421.167ZM835.03 416.5 843.03 420.5 835.03 424.5Z" className="path-arrow"/>
        <path d="M763.325 497.344 750.476 446.129 751.769 445.804 764.618 497.02ZM747.567 448.233 749.5 439.5 755.327 446.286Z" className="path-arrow"/>
        <path d="M802.537 558.023 768.625 534.815 769.378 533.715 803.29 556.922ZM767.843 538.319 763.5 530.5 772.361 531.717Z" className="path-arrow"/>
        <path d="M905.485 324.492 806.41 283.657 806.918 282.424 905.993 323.259ZM806.372 287.247 800.5 280.5 809.421 279.85Z" className="path-arrow"/>
        <path d="M0.398536-0.534428 32.4374 23.3578 31.6404 24.4266-0.398536 0.534428ZM33.3613 19.8886 37.3832 27.8776 28.5788 26.3017Z" transform="matrix(1 0 0 -1 868.5 384.378)" className="path-arrow"/>
        <path d="M868.855 472.935 900.592 492.861 899.883 493.99 868.146 474.065ZM901.235 489.329 905.883 496.971 896.981 496.105Z" className="path-arrow"/>
        <path d="M0.626926-0.226733 33.2207 89.8965 31.9668 90.35-0.626926 0.226733ZM35.9019 87.509 34.8611 96.3925 28.3788 90.2298Z" transform="matrix(-1 0 0 1 905.361 530.5)" className="path-arrow"/>
        <path d="M1012.86 211.94 1045.83 233.214 1045.1 234.334 1012.14 213.06ZM1046.51 229.69 1051.07 237.389 1042.18 236.412Z" className="path-arrow"/>
        <path d="M0.376287-0.550321 31.2735 20.576 30.5209 21.6766-0.376287 0.550321ZM32.0543 17.0718 36.4004 24.8891 27.5389 23.6756Z" transform="matrix(1 0 0 -1 886.5 237.389)" className="path-arrow"/>
        <path d="M886.918 236.98 918.25 262.159 917.415 263.199 886.082 238.02ZM919.299 258.726 923.029 266.855 914.287 264.962Z" className="path-arrow"/>
        <path d="M0.321175-0.584201 60.1755 32.3218 59.5331 33.4902-0.321175 0.584201ZM60.6129 28.7584 65.6963 36.1177 56.7588 35.7688Z" transform="matrix(1 0 0 -1 1013.5 266.618)" className="path-arrow"/>
        <path d="M1161.78 562.266 1126.38 535.089 1127.19 534.031 1162.59 561.209ZM1125.41 538.544 1121.5 530.5 1130.28 532.199Z" className="path-arrow"/>
        <path d="M0.660001-0.0940354 28.2311 193.418 26.9111 193.606-0.660001 0.0940354ZM31.3431 191.628 28.5115 200.112 23.4231 192.756Z" transform="matrix(1 0 0 -1 1121.5 496.612)" className="path-arrow"/>
        <path d="M0.64809-0.156281 33.6554 136.724 32.3592 137.036-0.64809 0.156281ZM36.5832 134.646 34.5701 143.361 28.8062 136.521Z" transform="matrix(1 0 0 -1 1161.5 561.861)" className="path-arrow"/>
        <path d="M1195.67 385.114 1148.4 268.926 1149.63 268.424 1196.91 384.612ZM1145.81 271.418 1146.5 262.5 1153.22 268.403Z" className="path-arrow"/>
        {/* *** END OF PATHS *** */}

        {/* --- Render OwnershipTokenBoxes LAST (so they are on top) --- */}
        {/* These already have rx="8" applied inside their component */}
        <OwnershipTokenBox x={732} y={214} />
        <OwnershipTokenBox x={735} y={593} />
        <OwnershipTokenBox x={1078} y={198} />
        <OwnershipTokenBox x={1093} y={598} />
      </g>
    </svg>
  );
};

export default DiagramIcon;