// lib/formOptions.ts

// Define role options
export const roleOptions = [
    { value: 'contributor', label: 'Contributor' },
    { value: 'investor', label: 'Investor' },
    { value: 'renter', label: 'Renter' },
    { value: 'real_estate_owner', label: 'Real Estate Owner' },
    { value: 'potential_partner', label: 'Potential Partner' },
    { value: 'other', label: 'Other' },
];

// Define investor type options
export const investorTypeOptions = [
    { value: 'individual', label: 'Individual' },
    { value: 'institutional', label: 'Institutional' },
];

// Define property owner type options
export const propertyOwnerTypeOptions = [
    { value: 'individual', label: 'Individual' },
    { value: 'company', label: 'Company' },
];

// Define Contributor type options
export const contributorTypeOptions = [
    { value: 'frontend', label: 'Frontend' },
    { value: 'backend', label: 'Backend' },
    { value: 'blockchain', label: 'Blockchain' },
    { value: 'uiux', label: 'UI/UX' },
    { value: 'devops', label: 'DevOps' },
    { value: 'legal', label: 'Legal' },
    { value: 'sales', label: 'Sales' },
    { value: 'other_contributor', label: 'Other' }, // Use distinct value for 'other' subtype
];