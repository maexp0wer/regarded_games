// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Assuming db utility is correctly set up in this path
import { query } from '@/lib/db';
// Assuming validation functions are correctly defined in this path
import { isValidEmail, isValidErc20Address, isValidNumber } from '@/lib/validation';
// Assuming options are correctly defined and exported from this path
import { contributorTypeOptions } from '@/lib/formOptions'; // Adjust path as needed
import crypto from 'node:crypto'; 

interface ContactFormData {
    name?: string | null;
    email?: string | null;
    walletAddress?: string | null;
    investmentAmount?: string | null;
    propertyAmount?: string | null;
    newsletter?: boolean;
    bountyAirdrop?: boolean;
    referenceCode?: string | null;
    ownReferenceCode?: string | null;
    selectedRoles?: string[];
    investorType?: string | null;
    propertyOwnerType?: string | null;
    contributorTypes?: string[]; // Receive array
    otherContributorType?: string | null; // Receive text
    partnerSpecification?: string | null;
    otherIdentity?: string | null;
    message?: string | null;
}

interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
}

// Helper function to format role labels (Capitalize and replace underscores)
function formatRoleLabel(roleValue: string): string {
    let label = roleValue.replace(/_/g, ' ');
    label = label.charAt(0).toUpperCase() + label.slice(1);
    // Handle specific cases
    label = label.replace('Real estate', 'Real Estate'); // Ensure consistent casing
    return label;
}

// Helper function to format contributor sub-types for storage
function formatContributorTypes(types: string[] = [], otherText?: string | null): string {
    if (!types || types.length === 0) return '';

    const formattedTypes = types.map(type => {
        if (type === 'other_contributor') {
            const trimmedText = otherText?.trim();
            return trimmedText ? `Other (${trimmedText})` : 'Other'; // Include specified text
        }
        // Find label from imported options for better formatting
        const option = contributorTypeOptions.find(o => o.value === type);
        return option ? option.label : formatRoleLabel(type); // Use label or fallback formatting
    });

    return formattedTypes.length > 0 ? ` (${formattedTypes.join(', ')})` : '';
}

// Helper function to extract IP address

function getClientIp(request: NextRequest): string | null {
    const xForwardedFor = request.headers.get('x-forwarded-for');
    if (xForwardedFor) {
        // The first IP in the list is the original client IP
        return xForwardedFor.split(',')[0].trim();
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    // Fallback for environments where 'request.ip' might be populated (e.g., Vercel)
    // Note: 'ip' is not standard on the Request object, relying on platform injection
    // return (request as any).ip || null;
    return null; // Return null if no standard header found
}

export async function POST(request: NextRequest) {
    // console.log("API: Received POST /api/contact request.");

    const clientIp = getClientIp(request);
    // console.log("API: Detected Client IP:", clientIp); //We dont want that, really

    let formData: ContactFormData;
    try {
        formData = await request.json();
    } catch (error) {
        console.error("API Error: Failed parsing JSON body.", error);
        return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    // Destructure with defaults
    const {
        name = null, email = null, walletAddress = null, investmentAmount = null,
        propertyAmount = null, newsletter = false, bountyAirdrop = false,
        referenceCode = null, ownReferenceCode = null,
        selectedRoles = [], investorType = null, propertyOwnerType = null,
        contributorTypes = [], otherContributorType = null,
        partnerSpecification = null, otherIdentity = null, message = null
    } = formData;

    // --- Server-Side Validation ---
    const errors: Record<string, string> = {};
    // console.log("API: Starting server-side validation...");

    // Role Validation
    if (!Array.isArray(selectedRoles) || selectedRoles.length === 0) {
        errors.selectedRoles = 'Please select at least one role.';
    } else {
        if (selectedRoles.includes('other') && !otherIdentity?.trim()) errors.otherIdentity = 'Please specify your role if "Other" is selected.';
        if (selectedRoles.includes('potential_partner') && !partnerSpecification?.trim()) errors.partnerSpecification = 'Please specify the type of partnership.';
        if (investorType && !['individual', 'institutional'].includes(investorType)) errors.investorType = 'Invalid investor type.';
        if (propertyOwnerType && !['individual', 'company'].includes(propertyOwnerType)) errors.propertyOwnerType = 'Invalid property owner type.';
        if (selectedRoles.includes('contributor')) {
            const validContributorValues = contributorTypeOptions.map(o => o.value);
            if (contributorTypes.some(type => !validContributorValues.includes(type))) errors.contributorTypes = 'Invalid contribution area selected.';
            if (contributorTypes.includes('other_contributor') && !otherContributorType?.trim()) errors.otherContributorType = 'Please specify your contribution area if "Other" is selected.';
        }
    }

    // Email Validation
    const emailToCheck = email?.trim() || null;
    const emailIsRequired = newsletter || selectedRoles.includes('real_estate_owner') || selectedRoles.includes('contributor') || selectedRoles.includes('potential_partner');
    if (emailIsRequired) {
        if (!emailToCheck) { errors.email = 'Email Address is required.'; }
        else if (!isValidEmail(emailToCheck)) { errors.email = 'A valid Email Address is required.'; }
    } else if (emailToCheck && !isValidEmail(emailToCheck)) { errors.email = "Invalid email format."; }

    // Wallet Address Validation
    const cleanWalletAddressForCheck = walletAddress?.trim() || null;
    if (bountyAirdrop) {
        if (!cleanWalletAddressForCheck) { errors.walletAddress = 'ERC-20 Wallet Address is required for the bounty airdrop.'; }
        else if (!isValidErc20Address(cleanWalletAddressForCheck)) { errors.walletAddress = 'Invalid ERC-20 Wallet Address format for bounty.'; }
    } else if (cleanWalletAddressForCheck && !isValidErc20Address(cleanWalletAddressForCheck)) { errors.walletAddress = "Invalid ERC-20 Wallet Address format."; }

    // Amount Validations
    let investmentAmountNumeric: number | null = null;
    if (investmentAmount && investmentAmount.trim() !== '') {
        if (!isValidNumber(investmentAmount.trim())) { errors.investmentAmount = "Investment Amount must be a valid number."; }
        else { const parsed = parseFloat(investmentAmount.trim()); if(parsed < 0) { errors.investmentAmount = "Investment Amount cannot be negative."; } else { investmentAmountNumeric = parsed; } }
    }
    let propertyAmountNumeric: number | null = null;
    if (propertyAmount && propertyAmount.trim() !== '') {
         if (!isValidNumber(propertyAmount.trim())) { errors.propertyAmount = "Property Amount must be a valid number."; }
         else { const parsed = parseFloat(propertyAmount.trim()); if(parsed < 0) { errors.propertyAmount = "Property Amount cannot be negative."; } else { propertyAmountNumeric = parsed; } }
    }
    
    // --- Reference Code Database Validation ---
    const referenceCodeToCheck = referenceCode?.trim() || null;
    if (referenceCodeToCheck) {
        // console.log("API: Validating reference code existence:", referenceCodeToCheck);
        try {
            const refCheckQuery = `SELECT 1 FROM contacts WHERE requested_ref_code = $1 LIMIT 1;`;
            const refCheckResult = await query(refCheckQuery, [referenceCodeToCheck]);
            if (refCheckResult.rowCount === 0) {
                // console.log("API Info: Provided reference code not found.");
                errors.referenceCode = 'Invalid reference code provided.';
            } else {
                 // console.log("API Info: Provided reference code is valid.");
            }
        } catch (dbError: unknown) {
            console.error("API Error: Database error during reference code check:", dbError);
            // Don't expose DB errors directly, return a generic error or fail validation
            errors.general = "Could not verify reference code due to a server error.";
        }
    }

    // --- IP Hash Duplicate Check (only if bounty is selected, skipped on local dev) ---
    const isLocal = process.env.NEXT_PUBLIC_ENVIRONMENT === 'local';
    let ipHash: string | null = null;
    if (bountyAirdrop && !isLocal) {
        if (!clientIp) {
            console.warn("API Warning: Could not determine client IP for bounty check.");
            errors.general = (errors.general ? errors.general + " " : "") + "Could not verify request origin.";
        } else {
            ipHash = crypto.createHash('sha256').update(clientIp).digest('hex');
            try {
                const ipCheckQuery = `SELECT 1 FROM contacts WHERE ip_hash = $1 LIMIT 1;`;
                const ipCheckResult = await query(ipCheckQuery, [ipHash]);
                if (ipCheckResult && ipCheckResult.rowCount && ipCheckResult.rowCount > 0) {
                    errors.general = (errors.general ? errors.general + " " : "") + "Duplicate bounty entry detected from this network.";
                }
            } catch (dbError: unknown) {
                console.error("API Error: Database error during IP hash check:", dbError);
                errors.general = (errors.general ? errors.general + " " : "") + "Could not perform bounty check due to a server error.";
            }
        }
    }
    

    if (Object.keys(errors).length > 0) {
        console.warn("API Validation Failed:", errors);
        return NextResponse.json({ message: "Validation failed.", errors }, { status: 400 });
    }

    // --- Database Interaction ---
    // console.log("API: Proceeding to database interaction...");
    try {
        // Duplicate Checks
        if (emailToCheck) {
            const checkEmailQuery = `SELECT email FROM contacts WHERE email = $1 LIMIT 1;`;
            const existingEmailResult = await query(checkEmailQuery, [emailToCheck]);
            if (existingEmailResult.rows.length > 0) { return NextResponse.json({ message: `Email already exists.` }, { status: 409 }); }
        }
        if (cleanWalletAddressForCheck) {
            const checkWalletQuery = `SELECT wallet_address FROM contacts WHERE wallet_address = $1 LIMIT 1;`;
            const existingWalletResult = await query(checkWalletQuery, [cleanWalletAddressForCheck]);
            if (existingWalletResult.rows.length > 0) { return NextResponse.json({ message: `Wallet Address already exists.` }, { status: 409 }); }
        }

        // Format who_are_you string including all details
        const rolesToStore: string[] = [];
        const otherIdentityTrimmed = otherIdentity?.trim();
        const partnerSpecTrimmed = partnerSpecification?.trim();

        selectedRoles.forEach(role => {
            const baseRoleLabel = formatRoleLabel(role);
            switch (role) {
                case 'investor':
                    if (investorType === 'individual') rolesToStore.push(`${baseRoleLabel} (Individual)`);
                    else if (investorType === 'institutional') rolesToStore.push(`${baseRoleLabel} (Institutional)`);
                    else rolesToStore.push(baseRoleLabel);
                    break;
                case 'real_estate_owner':
                    if (propertyOwnerType === 'individual') rolesToStore.push(`${baseRoleLabel} (Individual)`);
                    else if (propertyOwnerType === 'company') rolesToStore.push(`${baseRoleLabel} (Company)`);
                    else rolesToStore.push(baseRoleLabel);
                    break;
                case 'contributor':
                    const contributorDetails = formatContributorTypes(contributorTypes, otherContributorType);
                    rolesToStore.push(`${baseRoleLabel}${contributorDetails}`);
                    break;
                 case 'potential_partner':
                    if (partnerSpecTrimmed) rolesToStore.push(`${baseRoleLabel} (${partnerSpecTrimmed})`);
                    else rolesToStore.push(baseRoleLabel);
                    break;
                case 'other':
                    if (otherIdentityTrimmed) rolesToStore.push(`Other (${otherIdentityTrimmed})`);
                    else rolesToStore.push('Other');
                    break;
                default:
                    rolesToStore.push(baseRoleLabel); // Add other formatted roles like Renter
                    break;
            }
        });
        const finalWhoAreYou = rolesToStore.join(', ');

        const finalName = name?.trim() || null;
        const finalMessage = message?.trim() || null;
        const finalReferenceCode = referenceCodeToCheck; // Use the checked variable
        // Ensure ownReferenceCode is only saved if bountyAirdrop was checked (frontend doesn't send if unchecked)
        const finalOwnReferenceCode = bountyAirdrop ? (ownReferenceCode?.trim() || null) : null;

        const finalIpHash = (!isLocal && bountyAirdrop) ? ipHash : null;

        const values = [
            finalName,                      // $1
            emailToCheck,                   // $2
            cleanWalletAddressForCheck,     // $3
            investmentAmountNumeric,        // $4
            propertyAmountNumeric,          // $5
            newsletter,                     // $6
            bountyAirdrop,                  // $7
            finalWhoAreYou,                 // $8
            finalMessage,                   // $9
            finalReferenceCode,             // $10
            finalOwnReferenceCode,          // $11
            finalIpHash,                    // $12 — null on local, sha256(ip) on testnet/prod
        ];

        const insertQuery = `
            INSERT INTO contacts (
                name, email, wallet_address, investment_amount, property_amount,
                newsletter, bounty_airdrop, who_are_you, message,
                reference_code, requested_ref_code, ip_hash
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id;
        `;

        // console.log("API: Executing insert query...");
        const result = await query(insertQuery, values);

        if (result.rowCount === 1) {
            //console.log("API: Form submitted successfully. ID:", result.rows[0].id);
            return NextResponse.json({ message: "Form submitted successfully!", id: result.rows[0].id }, { status: 201 });
        } else {
             console.error("API Error: Database insertion returned unexpected row count.", { rowCount: result.rowCount });
             return NextResponse.json({ message: "Failed to save submission due to unexpected database result." }, { status: 500 });
        }

    } catch (err: unknown) { // 2. Catch as unknown (safe)
  
            // 3. Cast it to your interface so TypeScript knows about .code and .constraint
            const error = err as DatabaseError; 

            console.error("API Error (Database Interaction):", error);

            // Now TypeScript is happy with accessing .code
            if (error.code === '23505') { 
                let field = 'Data';
                let fieldKey = 'general'; 
                //let message = `${field} already exists.`;

                // TypeScript now knows .constraint and .detail exist
                if (error.constraint === 'contacts_email_key' || error.detail?.includes('(email)')) {
                    field = 'Email';
                    fieldKey = 'email';
                } else if (error.constraint === 'contacts_wallet_address_key' || error.detail?.includes('(wallet_address)')) {
                    field = 'ERC-20 Wallet Address';
                    fieldKey = 'walletAddress';
                } else if (error.constraint === 'contacts_requested_ref_code_key' || error.detail?.includes('(requested_ref_code)')) {
                    field = 'Desired Reference Code';
                    fieldKey = 'ownReferenceCode'; 
                }
                else if (error.constraint === 'contacts_ip_hash_key' || error.detail?.includes('(ip_hash)')) {
                    field = 'Bounty Entry'; fieldKey = 'general';
                }
            
   
            console.warn(`API Info: Unique constraint violation (${field}), returning 409.`);
            // Return specific field error if identified
            return NextResponse.json({ message: `${field} already exists or is already requested.`, errors: { [fieldKey]: `${field} already exists or is already requested.` } }, { status: 409 }); // Use 409 Conflict
        }
        return NextResponse.json({ message: "An internal server error occurred processing your request." }, { status: 500 });
    }
}