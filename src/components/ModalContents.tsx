// lib/modalContents.tsx
import React, { ReactNode } from 'react';
import { VoteDiagramStep1, VoteDiagramStep2, VoteDiagramStep3, VoteDiagramStep4, VoteDiagramStep5, VoteDiagramStep6  } from './diagrams/VoteDiagram';

// --- Import your COMPLETE SVG components for EACH step ---
// Example: You need components like VoteDiagramStep0, VoteDiagramStep1, ShapeDiagramStep0, ShapeDiagramStep1 etc.
// They MUST render a full <svg> tag with viewBox and accept className for scaling.
// Step 0 components can just return null: export const VoteDiagramStep0 = () => null;

// Example placeholder imports (replace with your actual components)
const VoteDiagramStep0 = () => null; // No diagram for intro
const IntroTop0 = ({ title }: { title: string }) => <div className=" text-text"><p className='text-primary font-cursive italic'>Allows members to make collective decisions on proposals, such as project funding, rule changes, or governance policies. Members vote based on their token holdings. This decentralized process gives stakeholders control and shapes the DAO's direction.
</p> <p>There are 3 different assets that enable someone to vote on issues regarding the Aigenheim DAO:
</p> </div>;
const VoteTop1 = () => <div className="text-text"><p>- ZuhausO, the Ownership Token: Represents ownership of a property</p></div>;
const VoteTop2 = () => <div className="text-text"><p>- ZuhausR, the Renter Token: Represents renting a property</p></div>;
const VoteTop3 = () => <div className="text-text"><p>- Zuhausi: Aigenheim DAO’s native coin that is used as currency for all transaction fees on the network</p></div>;
const VoteTop4 = () => <div className="text-text"><p>Each asset has its own Voting Pool. The total vote is compromised of 1/3 Owner Vote, 1/3 Renter Vote and 1/3 Coin Holder Vote. In each pool, the votes are weighed against the worth of the token each voter holds. An ZuhausR renter tokens voting power depends on the monthly rent it is associated with.</p></div>;
const VoteTop5 = () => <div className="text-text"><p>Voting outcomes are stored in a rules contract, where they are accessed by other contracts that execute these rules.</p></div>;
const VoteTop6 = () => <div className="text-text"><p>Examples of rules: rent ceiling based on staple goods, amount of rent withheld in the Property Vault, Amount of ZuhausO the Aigenheim DAO receives during the tokenization process</p></div>;


const ShapeDiagramStep0 = () => null; // No diagram for intro
const ShapeDiagramStep1 = ({ className }: { className?: string }) => <svg viewBox="0 0 100 100" className={className}><polygon points="50,5 95,95 5,95" fill="orange" /></svg>;
const ShapeDiagramStep2 = ({ className }: { className?: string }) => <svg viewBox="0 0 100 100" className={className}><polygon points="50,5 95,95 5,95" fill="orange" /><ellipse cx="50" cy="50" rx="20" ry="10" fill="purple" /></svg>;
const ShapeDiagramStep3 = ({ className }: { className?: string }) => <svg viewBox="0 0 100 100" className={className}><polygon points="50,5 95,95 5,95" fill="orange" /><ellipse cx="50" cy="50" rx="20" ry="10" fill="purple" /><path d="M10 10 C 40 80, 60 80, 90 10" stroke="green" strokeWidth="2" fill="transparent" /></svg>;


// --- Define Top Part Components (including Intro at index 0) ---

const ShapeTop1 = () => <div className="bg-lime-50 dark:bg-lime-900/60 p-4 rounded mb-4 border dark:border-lime-700/30"><h4 className="font-semibold text-lime-700 dark:text-lime-300">Shape Step 1: Square</h4><p>Properties of the square.</p></div>;
const ShapeTop2 = () => <div className="bg-lime-100 dark:bg-lime-800/60 p-4 rounded mb-4 border dark:border-lime-600/30"><h4 className="font-semibold text-lime-700 dark:text-lime-300">Shape Step 2: Circle</h4><p>Properties of the circle.</p></div>;
const ShapeTop3 = () => <div className="bg-lime-200 dark:bg-lime-700/60 p-4 rounded mb-4 border dark:border-lime-500/30"><h4 className="font-semibold text-lime-700 dark:text-lime-300">Shape Step 3: Triangle</h4><p>Properties of the triangle.</p></div>;


// --- Define the structure for content sets ---
interface ModalContentSet {
    id: string;
    title: string;
    // Includes Step 0, Step 1, Step 2...
    topParts: ReactNode[];
    // Includes element for Step 0 (e.g., null), Step 1, Step 2...
    // MUST have the same length as topParts
    bottomParts: ReactNode[];
    svgContainerAspectRatio?: string; // Optional: aspect ratio for the SVG container e.g. '550 / 481'
}

// --- Prepare scaling classes for SVG components ---
// These will be passed via the `className` prop when instantiating the SVG components
const svgScalingClasses = "w-full h-full object-contain max-h-full text-gray-700 dark:text-gray-300";

// --- Export the different content sets ---
export const voteSet1: ModalContentSet = {
    id: 'voteSet1',
    title: 'Voting Process',
    // Length = 3 (Intro, Step 1, Step 2)
    topParts: [
        <IntroTop0 key="vt0" title="Voting Process"/>,
        <VoteTop1 key="vt1"/>,
        <VoteTop2 key="vt2"/>,
        <VoteTop3 key="vt3"/>,
        <VoteTop4 key="vt4"/>,
        <VoteTop5 key="vt5"/>,
        <VoteTop6 key="vt6"/>
        
    ],
    // Length = 3 (Step 0 SVG, Step 1 SVG, Step 2 SVG)
    bottomParts: [
        <VoteDiagramStep0 key="vb0" />, // Step 0 SVG is null
        <VoteDiagramStep1 key="vb1" className={svgScalingClasses} />,
        <VoteDiagramStep2 key="vb2" className={svgScalingClasses} />,
        <VoteDiagramStep3 key="vb3" className={svgScalingClasses} />,
        <VoteDiagramStep4 key="vb4" className={svgScalingClasses} />,
        <VoteDiagramStep5 key="vb5" className={svgScalingClasses} />,
        <VoteDiagramStep6 key="vb6" className={svgScalingClasses} /> 
    ],
    svgContainerAspectRatio: '550 / 481' // Aspect ratio matching the original SVG
};

export const shapeSet2: ModalContentSet = {
    id: 'shapeSet2',
    title: 'Shape',
    // Length = 4 (Intro, Step 1, Step 2, Step 3)
    topParts: [
        <IntroTop0 key="st0" title="Shape"/>,
        <ShapeTop1 key="st1"/>,
        <ShapeTop2 key="st2"/>,
        <ShapeTop3 key="st3"/>
    ],
    // Length = 4
    bottomParts: [
        <ShapeDiagramStep0 key="sb0" />, // Step 0 SVG is null
        <ShapeDiagramStep1 key="sb1" className={svgScalingClasses} />, // Pass scaling classes
        <ShapeDiagramStep2 key="sb2" className={svgScalingClasses} />, // Pass scaling classes
        <ShapeDiagramStep3 key="sb3" className={svgScalingClasses} />  // Pass scaling classes
    ],
    svgContainerAspectRatio: '1 / 1' // Example square aspect ratio
};

// --- Optional: Create a mapping ---
export const allModalContents: Record<string, ModalContentSet> = {
    [voteSet1.id]: voteSet1,
    [shapeSet2.id]: shapeSet2,
};

// --- Export a type for valid content IDs ---
export type ModalContentId = keyof typeof allModalContents;