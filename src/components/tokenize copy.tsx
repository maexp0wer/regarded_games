// components/DiagramIcon.tsx (Note the .tsx extension if using TypeScript)
import React, { SVGProps } from 'react'; // Import SVGProps type
import './tokenize.css'

// Define the type for the component's props
// SVGProps<SVGSVGElement> includes className?, children?, and all standard SVG attributes
type DiagramIconProps = SVGProps<SVGSVGElement>;

const DiagramIcon = ({ className, ...rest }: DiagramIconProps) => { // Add type annotation here
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="653 177 595 529"
      overflow="hidden"
      className={className} // className is now correctly typed as string | undefined
      {...rest} // ...rest is now correctly typed to accept other valid SVG props
    >
      <g>
        {/* --- Paste the rest of your <g> content here --- */}
        {/* (Same <rect>, <text>, <path> elements as before) */}
{/* Add className attributes like these to your React component elements */}

        <rect x="654" y="384" width="428" height="89" className="rect-minter-box"/>
        <text transform="translate(779.306 465)" className="text-minter-title">Ownership Token Minter</text>
        <text transform="translate(955.972 465)" className="text-empty-1"/> {/* Add class if styling needed */}
        <rect x="681" y="401" width="135" height="38" className="rect-request-button"/>
        <text transform="translate(718.605 422)" className="text-request-label">Request</text>
        <text transform="translate(778.438 422)" className="text-empty-2"/> {/* Add class if styling needed */}
        <rect x="714" y="178" width="172" height="118" className="rect-seller-box"/>
        <text transform="translate(778.617 198)" className="text-seller-title">Seller</text>
        <text transform="translate(820.95 198)" className="text-empty-3"/> {/* Add class if styling needed */}
        <rect x="718" y="323" width="90" height="34" className="rect-send-button-1"/>
        <text transform="translate(744.91 344)" className="text-send-label-1">Send</text>
        <text transform="translate(781.076 344)" className="text-empty-4"/> {/* Add class if styling needed */}
        <path d="M0.394373-0.537507 31.8098 22.5122 31.0211 23.5873-0.394373 0.537507ZM32.7067 19.036 36.7906 26.9935 27.9742 25.4861Z" transform="matrix(-1 0 0 1 800.291 296.5)" className="path-arrow-1"/>
        <path d="M0.634009-0.2061 13.0446 37.9717 11.7766 38.3839-0.634009 0.2061ZM15.8025 35.6732 14.4716 44.5179 8.19435 38.1464Z" transform="matrix(-1 0 0 1 763.972 357.5)" className="path-arrow-2"/>
        <rect x="842" y="401" width="218" height="37" className="rect-mint-button"/>
        <text transform="translate(870.624 422)" className="text-mint-label">Mint Ownership Token</text>
        <text transform="translate(1032.29 422)" className="text-empty-5"/> {/* Add class if styling needed */}
        <text transform="translate(951.458 441)" className="text-empty-6"/> {/* Add class if styling needed */}
        <path d="M819.5 419.833 836.363 419.833 836.363 421.167 819.5 421.167ZM835.03 416.5 843.03 420.5 835.03 424.5Z" className="path-arrow-3"/>
        <rect x="717" y="557" width="171" height="118" className="rect-aigenheim-box"/>
        <text transform="translate(746.739 577)" className="text-aigenheim-title-1">Aigenheim</text>
        <text transform="translate(823.573 577)" className="text-empty-7"/> {/* Add class if styling needed */}
        <text transform="translate(827.073 577)" className="text-aigenheim-title-2">DAO</text>
        <text transform="translate(858.073 577)" className="text-empty-8"/> {/* Add class if styling needed */}
        <rect x="718" y="496" width="90" height="34" className="rect-approve-button"/>
        <text transform="translate(732.576 517)" className="text-approve-label">Approve</text>
        <text transform="translate(793.41 517)" className="text-empty-9"/> {/* Add class if styling needed */}
        <path d="M763.325 497.344 750.476 446.129 751.769 445.804 764.618 497.02ZM747.567 448.233 749.5 439.5 755.327 446.286Z" className="path-arrow-4"/>
        <rect x="732" y="214" width="136" height="66" className="rect-ownership-token-1"/>
        <text transform="translate(760.284 235)" className="text-ownership-token-1a">Ownership</text>
        <text transform="translate(778.537 254)" className="text-ownership-token-1b">Token</text>
        <text transform="translate(821.037 254)" className="text-empty-10"/> {/* Add class if styling needed */}
        <path d="M802.537 558.023 768.625 534.815 769.378 533.715 803.29 556.922ZM767.843 538.319 763.5 530.5 772.361 531.717Z" className="path-arrow-5"/>
        <rect x="860" y="323" width="90" height="33" className="rect-send-button-2"/>
        <text transform="translate(886.939 344)" className="text-send-label-2">Send</text>
        <text transform="translate(923.105 344)" className="text-empty-11"/> {/* Add class if styling needed */}
        <path d="M905.485 324.492 806.41 283.657 806.918 282.424 905.993 323.259ZM806.372 287.247 800.5 280.5 809.421 279.85Z" className="path-arrow-6"/>
        <path d="M0.398536-0.534428 32.4374 23.3578 31.6404 24.4266-0.398536 0.534428ZM33.3613 19.8886 37.3832 27.8776 28.5788 26.3017Z" transform="matrix(1 0 0 -1 868.5 384.378)" className="path-arrow-7"/>
        <rect x="860" y="496" width="90" height="34" className="rect-send-button-3"/>
        <text transform="translate(886.939 517)" className="text-send-label-3">Send</text>
        <text transform="translate(923.105 517)" className="text-empty-12"/> {/* Add class if styling needed */}
        <rect x="735" y="593" width="135" height="66" className="rect-ownership-token-2"/>
        <text transform="translate(762.906 614)" className="text-ownership-token-2a">Ownership</text>
        <text transform="translate(781.159 633)" className="text-ownership-token-2b">Token</text>
        <text transform="translate(823.659 633)" className="text-empty-13"/> {/* Add class if styling needed */}
        <path d="M868.855 472.935 900.592 492.861 899.883 493.99 868.146 474.065ZM901.235 489.329 905.883 496.971 896.981 496.105Z" className="path-arrow-8"/>
        <path d="M0.626926-0.226733 33.2207 89.8965 31.9668 90.35-0.626926 0.226733ZM35.9019 87.509 34.8611 96.3925 28.3788 90.2298Z" transform="matrix(-1 0 0 1 905.361 530.5)" className="path-arrow-9"/>
        <rect x="1051" y="177" width="196" height="119" className="rect-listing-box"/>
        <text transform="translate(1091.06 288)" className="text-listing-title">Property Listing</text>
        <text transform="translate(1207.06 288)" className="text-empty-14"/> {/* Add class if styling needed */}
        <rect x="1078" y="198" width="136" height="64" className="rect-ownership-token-3"/>
        <text transform="translate(1106.52 219)" className="text-ownership-token-3a">Ownership</text>
        <text transform="translate(1124.77 238)" className="text-ownership-token-3b">Token</text>
        <text transform="translate(1167.27 238)" className="text-empty-15"/> {/* Add class if styling needed */}
        <path d="M1012.86 211.94 1045.83 233.214 1045.1 234.334 1012.14 213.06ZM1046.51 229.69 1051.07 237.389 1042.18 236.412Z" className="path-arrow-10"/>
        <rect x="922" y="195" width="90" height="34" className="rect-create-button"/>
        <text transform="translate(943.417 216)" className="text-create-label">Create</text>
        <text transform="translate(991.084 216)" className="text-empty-16"/> {/* Add class if styling needed */}
        <path d="M0.376287-0.550321 31.2735 20.576 30.5209 21.6766-0.376287 0.550321ZM32.0543 17.0718 36.4004 24.8891 27.5389 23.6756Z" transform="matrix(1 0 0 -1 886.5 237.389)" className="path-arrow-11"/>
        <rect x="922" y="250" width="91" height="33" className="rect-sell-button-1"/>
        <text transform="translate(953.712 270)" className="text-sell-label-1">Sell</text>
        <text transform="translate(981.046 270)" className="text-empty-17"/> {/* Add class if styling needed */}
        <path d="M886.918 236.98 918.25 262.159 917.415 263.199 886.082 238.02ZM919.299 258.726 923.029 266.855 914.287 264.962Z" className="path-arrow-12"/>
        <path d="M0.321175-0.584201 60.1755 32.3218 59.5331 33.4902-0.321175 0.584201ZM60.6129 28.7584 65.6963 36.1177 56.7588 35.7688Z" transform="matrix(1 0 0 -1 1013.5 266.618)" className="path-arrow-13"/>
        <rect x="1075" y="561" width="172" height="119" className="rect-owner-box"/>
        <text transform="translate(1137.15 582)" className="text-owner-title">Owner</text>
        <text transform="translate(1185.32 582)" className="text-empty-18"/> {/* Add class if styling needed */}
        <rect x="1093" y="598" width="136" height="65" className="rect-ownership-token-4"/>
        <text transform="translate(1121.74 619)" className="text-ownership-token-4a">Ownership</text>
        <text transform="translate(1139.99 638)" className="text-ownership-token-4b">Token</text>
        <text transform="translate(1182.49 638)" className="text-empty-19"/> {/* Add class if styling needed */}
        <rect x="1157" y="381" width="90" height="61" className="rect-buy-sell-button"/>
        <text transform="translate(1180.0 402)" className="text-buy-sell-label-1">Buy &</text>
        <text transform="translate(1188.26 421)" className="text-buy-sell-label-2">Sell</text>
        <text transform="translate(1215.59 421)" className="text-empty-20"/> {/* Add class if styling needed */}
        <rect x="1075" y="496" width="91" height="34" className="rect-modify-button"/>
        <text transform="translate(1095.13 517)" className="text-modify-label">Modify</text>
        <text transform="translate(1145.97 517)" className="text-empty-21"/> {/* Add class if styling needed */}
        <path d="M1161.78 562.266 1126.38 535.089 1127.19 534.031 1162.59 561.209ZM1125.41 538.544 1121.5 530.5 1130.28 532.199Z" className="path-arrow-14"/>
        <path d="M0.660001-0.0940354 28.2311 193.418 26.9111 193.606-0.660001 0.0940354ZM31.3431 191.628 28.5115 200.112 23.4231 192.756Z" transform="matrix(1 0 0 -1 1121.5 496.612)" className="path-arrow-15"/>
        <path d="M0.630736-0.215908 39.1601 112.34 37.8986 112.772-0.630736 0.215908ZM41.882 110 40.6885 118.864 34.3132 112.59Z" transform="matrix(1 0 0 -1 1161.5 561.364)" className="path-arrow-16"/>
        <path d="M1201.8 381.957 1148.73 268.819 1149.94 268.252 1203.01 381.391ZM1146.28 271.442 1146.5 262.5 1153.52 268.044Z" className="path-arrow-17"/>
        {/* --- End of <g> content --- */}
      </g>
    </svg>
  );
};

export default DiagramIcon;