// components/ContactForm.tsx
'use client';

import React, { useState, FormEvent } from 'react';
import { useTheme } from '../context/ThemeContext';
// Assuming validation functions are correctly defined in this path
import { isValidEmail, isValidErc20Address, isValidNumber } from '@/lib/validation';
// Assuming options are correctly defined and exported from this path
import {
  roleOptions,
  investorTypeOptions,
  futurePlayerTypeOptions,
  contributorTypeOptions
} from '@/lib/formOptions'; // Adjust path as needed





interface FormErrors {
  email?: string;
  walletAddress?: string;
  investmentAmount?: string;
  playAmount?: string;
  referenceCode?: string; // Error for received reference code
  ownReferenceCode?: string; // Error for desired reference code
  selectedRoles?: string; // Error for the main role buttons
  investorType?: string; // Optional error for investor sub-type
  futurePlayerType?: string; // Optional error for property owner sub-type
  contributorTypes?: string; // Optional error for contributor sub-types
  otherContributorType?: string; // Error for other contributor text
  partnerSpecification?: string; // Error for partner specification text
  otherIdentity?: string; // Error for main 'Other' role text
  general?: string; // For API/general errors
}

const ContactForm: React.FC = () => {

  // --- State ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [playAmount, setPlayMoney] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [bountyAirdrop, setBountyAirdrop] = useState(false);
  const [referenceCode, setReferenceCode] = useState('');
  const [getOwnCode, setGetOwnCode] = useState(false);
  const [ownReferenceCode, setOwnReferenceCode] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [investorType, setInvestorType] = useState<'individual' | 'institutional' | ''>('');
  const [futurePlayerType, setfuturePlayerType] = useState<'carlo' | 'ritardo' | ''>('');
  const [contributorTypes, setContributorTypes] = useState<string[]>([]);
  const [otherContributorType, setOtherContributorType] = useState('');
  const [partnerSpecification, setPartnerSpecification] = useState('');
  const [otherIdentity, setOtherIdentity] = useState('');
  const [message, setMessage] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  // --- Event Handlers ---
  const handleRoleClick = (roleValue: string) => {
      setSelectedRoles(prevRoles => {
          const isCurrentlySelected = prevRoles.includes(roleValue);
          let newRoles: string[];

          if (isCurrentlySelected) {
              newRoles = prevRoles.filter(role => role !== roleValue);
              // Reset conditional fields on deselection
              if (roleValue === 'other') setOtherIdentity('');
              if (roleValue === 'investor') { setInvestmentAmount(''); setInvestorType(''); }
              if (roleValue === 'future_player') { setPlayMoney(''); setfuturePlayerType(''); }
              if (roleValue === 'contributor') { setContributorTypes([]); setOtherContributorType(''); }
              if (roleValue === 'potential_partner') setPartnerSpecification('');
          } else {
              newRoles = [...prevRoles, roleValue];
          }
          return newRoles;
      });
      // Clear related errors
      setErrors(prev => ({ ...prev, selectedRoles: undefined, otherIdentity: undefined, investorType: undefined, futurePlayerType: undefined, contributorTypes: undefined, otherContributorType: undefined, partnerSpecification: undefined }));
  };

  const handleInvestorTypeClick = (type: 'individual' | 'institutional') => {
      setInvestorType(type);
      setErrors(prev => ({...prev, investorType: undefined}));
  };

  const handlefuturePlayerTypeClick = (type: 'ritardo' | 'carlo') => {
      setfuturePlayerType(type);
      setErrors(prev => ({...prev, futurePlayerType: undefined}));
  };

  const handleContributorTypeClick = (contributorValue: string) => {
      setContributorTypes(prevTypes => {
          const isSelected = prevTypes.includes(contributorValue);
          let newTypes: string[];
          if (isSelected) {
              newTypes = prevTypes.filter(type => type !== contributorValue);
              if (contributorValue === 'other_contributor') {
                  setOtherContributorType('');
              }
          } else {
              newTypes = [...prevTypes, contributorValue];
          }
          return newTypes;
      });
      setErrors(prev => ({ ...prev, contributorTypes: undefined, otherContributorType: undefined }));
  };

  const handlePartnerSpecChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPartnerSpecification(event.target.value);
     if (errors.partnerSpecification) setErrors(prev => ({ ...prev, partnerSpecification: undefined }));
  };

  const handleOtherTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOtherIdentity(event.target.value);
     if (errors.otherIdentity) setErrors(prev => ({ ...prev, otherIdentity: undefined }));
  };

  const handleBountyCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.target.checked;
      setBountyAirdrop(isChecked);
      if (!isChecked) {
          setWalletAddress(''); setReferenceCode(''); setGetOwnCode(false); setOwnReferenceCode('');
          setErrors(prev => ({ ...prev, walletAddress: undefined, referenceCode: undefined, ownReferenceCode: undefined }));
      } else { setErrors(prev => ({ ...prev, walletAddress: undefined })); }
  };

  const handleReferenceCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setReferenceCode(event.target.value);
      if (errors.referenceCode) setErrors(prev => ({ ...prev, referenceCode: undefined }));
  };

  const handleGetOwnCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.target.checked;
      setGetOwnCode(isChecked);
      if (!isChecked) { setOwnReferenceCode(''); setErrors(prev => ({ ...prev, ownReferenceCode: undefined })); }
      else { setErrors(prev => ({ ...prev, ownReferenceCode: undefined })); }
  };

   const handleOwnReferenceCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setOwnReferenceCode(event.target.value);
       if (errors.ownReferenceCode) setErrors(prev => ({ ...prev, ownReferenceCode: undefined }));
   };

  // --- Client-Side Validation ---
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

  

    // Role validation
    if (selectedRoles.length === 0) { newErrors.selectedRoles = 'Please select at least one role.'; isValid = false; }
    else {
        if (selectedRoles.includes('other') && !otherIdentity.trim()) { newErrors.otherIdentity = 'Please specify your role if "Other" is selected.'; isValid = false; }
        if (selectedRoles.includes('potential_partner') && !partnerSpecification.trim()) { newErrors.partnerSpecification = 'Please specify the type of partnership.'; isValid = false; }
        if (selectedRoles.includes('contributor') && contributorTypes.includes('other_contributor') && !otherContributorType.trim()) { newErrors.otherContributorType = 'Please specify your contribution area if "Other" is selected.'; isValid = false; }
        // Optional checks for sub-types can be added here if they become mandatory
    }

    // Email Validation
    const emailToCheck = email?.trim() || null;
    const emailIsRequired = newsletter || selectedRoles.includes('contributor') || selectedRoles.includes('potential_partner');
    if (emailIsRequired) {
        if (!emailToCheck) { newErrors.email = 'Email Address is required.'; isValid = false; }
        else if (!isValidEmail(emailToCheck)) { newErrors.email = 'A valid Email Address is required.'; isValid = false; }
    } else if (emailToCheck && !isValidEmail(emailToCheck)) { newErrors.email = "Invalid email format."; isValid = false; }

    // Wallet Address Validation (Only if bounty checked)
    const cleanWalletAddressForCheck = walletAddress?.trim() || null;
    if (bountyAirdrop) {
        if (!cleanWalletAddressForCheck) { newErrors.walletAddress = 'ERC-20 Wallet Address is required for the bounty airdrop.'; isValid = false; }
        else if (!isValidErc20Address(cleanWalletAddressForCheck)) { newErrors.walletAddress = 'Invalid ERC-20 Wallet Address format for bounty.'; isValid = false; }
    } else if (cleanWalletAddressForCheck && !isValidErc20Address(cleanWalletAddressForCheck)) { newErrors.walletAddress = "Invalid ERC-20 Wallet Address format."; isValid = false; }

    // Amount Validations
    if (investmentAmount && investmentAmount.trim() !== '') {
        if (!isValidNumber(investmentAmount.trim())) { newErrors.investmentAmount = "Investment Amount must be a valid number."; isValid = false; }
        else { const parsed = parseFloat(investmentAmount.trim()); if(parsed < 0) { newErrors.investmentAmount = "Investment Amount cannot be negative."; isValid = false; } }
    }
    if (playAmount && playAmount.trim() !== '') {
         if (!isValidNumber(playAmount.trim())) { newErrors.playAmount = "Property Amount must be a valid number."; isValid = false; }
         else { const parsed = parseFloat(playAmount.trim()); if(parsed < 0) { newErrors.playAmount = "Property Amount cannot be negative."; isValid = false; } }
    }

    // Optional: Add format validation for reference codes if needed

    setErrors(newErrors);
    return isValid;
  };

  // --- Form Submission Handler ---
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitStatus('idle'); setSubmitMessage(''); setErrors({});
    if (!validateForm()) { return; }
    setIsLoading(true);

    const formData = {
      name: name.trim() || null,
      email: email.trim() || null,
      walletAddress: walletAddress.trim() || null,
      investmentAmount: selectedRoles.includes('investor') ? (investmentAmount.trim() || null) : null,
      playAmount: selectedRoles.includes('future_player') ? (playAmount.trim() || null) : null,
      newsletter,
      bountyAirdrop,
      referenceCode: referenceCode.trim() || null,
      ownReferenceCode: getOwnCode ? (ownReferenceCode.trim() || null) : null,
      selectedRoles,
      investorType: selectedRoles.includes('investor') ? (investorType || null) : null,
      futurePlayerType: selectedRoles.includes('future_player') ? (futurePlayerType || null) : null,
      contributorTypes: selectedRoles.includes('contributor') ? contributorTypes : [],
      otherContributorType: selectedRoles.includes('contributor') && contributorTypes.includes('other_contributor') ? otherContributorType.trim() : undefined,
      partnerSpecification: selectedRoles.includes('potential_partner') ? partnerSpecification.trim() : undefined,
      otherIdentity: selectedRoles.includes('other') ? otherIdentity.trim() : undefined,
      message: message.trim() || null,
    };

    try {
        const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(formData) });
        const result = await response.json();
        if (response.ok) {
            setSubmitStatus('success'); setSubmitMessage(result.message || 'Form submitted successfully!');
            // Reset form fields
            setName(''); setEmail(''); setWalletAddress(''); setInvestmentAmount('');
            setPlayMoney(''); setNewsletter(false); setBountyAirdrop(false);
            setReferenceCode(''); setGetOwnCode(false); setOwnReferenceCode('');
            setSelectedRoles([]); setInvestorType(''); setfuturePlayerType('');
            setContributorTypes([]); setOtherContributorType('');
            setPartnerSpecification(''); setOtherIdentity(''); setMessage(''); setErrors({});
        } else {
            setSubmitStatus('error'); setSubmitMessage(result.message || `An error occurred (Status: ${response.status})`);
            if (result.errors) { setErrors(result.errors); } else { setErrors({ general: result.message || 'An unknown error occurred.'}); }
        }
    } catch (error) {
        console.error('Submission error:', error); setSubmitStatus('error');
        setSubmitMessage('An unexpected error occurred. Please try again later.');
        setErrors({ general: 'Could not connect to the server.' });
    } finally { setIsLoading(false); }
  };

  // --- Tailwind CSS Classes ---
  const inputClasses = "mt-1 block w-full px-3 py-2 bg-card2 rounded-md text-sm shadow-sm placeholder-bg3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-primary text-text";
  const labelClasses = "block text-sm font-medium text-text";
  const errorClasses = "mt-1 text-xs text-danger";
  const checkboxLabelClasses = "ml-2 text-sm text-text";
  const checkboxClasses = "h-4 w-4 rounded text-text focus:ring-primary border-primary";
  const requiredStar = <span className="text-danger">*</span>;
  const buttonBaseClasses = "px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary";
  const buttonInactiveClasses = "bg-card2 border-card2 text-text hover:bg-card3";
  const buttonActiveClasses = "bg-primary text-bg";
  const subButtonBaseClasses = "px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out";
  const subButtonInactiveClasses = "bg-card2 border-card2 text-text hover:bg-card3";
  const subButtonActiveClasses = "bg-primary text-bg";
  const { darkMode} = useTheme();

  return (

  

    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-card rounded-lg shadow-md ">
       {/* General Success/Error Messages */}
       {submitStatus === 'success' && ( <div className={`p-4 mb-4 text-sm ${darkMode ? 'dark text-bg' : 'texttext'} bg-success rounded-lg`} role="alert">{submitMessage}</div> )}
       {submitStatus === 'error' && ( <div className="p-4 mb-4 text-sm text-bg bg-danger rounded-lg" role="alert">{submitMessage || 'An error occurred. Please check the fields below.'}</div> )}
       <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-2 lg:gap-x-6">

          {/* Role Buttons - Top */}
          <div className="lg:col-span-2">
            <fieldset>
              <legend className={`${labelClasses} mb-2`}>Who are you? (Select all that apply) {requiredStar}</legend>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map(option => (
                  <button key={option.value} type="button" onClick={() => handleRoleClick(option.value)}
                    className={`${buttonBaseClasses} ${selectedRoles.includes(option.value) ? buttonActiveClasses : buttonInactiveClasses}`}
                    aria-pressed={selectedRoles.includes(option.value)} >
                    {option.label}
                  </button>
                ))}
              </div>
              {errors.selectedRoles && <p className={errorClasses}>{errors.selectedRoles}</p>}
            </fieldset>
          </div>

           {/* Conditional Investor Type Sub-Buttons */}
           {selectedRoles.includes('investor') && (
                <div className="lg:col-span-2 -mt-2 mb-2">
                    <fieldset>
                      <legend className={`${labelClasses} text-sm mb-2`}>What kind of Investor?</legend>
                      <div className="flex flex-wrap gap-2">
                         {investorTypeOptions.map(option => (
                              <button key={option.value} type="button"
                                onClick={() => handleInvestorTypeClick(option.value as 'individual' | 'institutional')}
                                className={`${subButtonBaseClasses} ${investorType === option.value ? subButtonActiveClasses : subButtonInactiveClasses}`}
                                aria-pressed={investorType === option.value} >
                                {option.label}
                              </button>
                         ))}
                      </div>
                      {errors.investorType && <p className={errorClasses}>{errors.investorType}</p>}
                  </fieldset>
                </div>
           )}

           {/* Conditional Future Palyer Type Sub-Buttons */}
           {selectedRoles.includes('future_player') && (
                <div className="lg:col-span-2 -mt-2 mb-2">
                     <fieldset>
                      <legend className={`${labelClasses} text-sm mb-2`}>Who is your Hero?</legend>
                      <div className="flex flex-wrap gap-2">
                         {futurePlayerTypeOptions.map(option => (
                              <button key={option.value} type="button"
                                onClick={() => handlefuturePlayerTypeClick(option.value as 'ritardo' | 'carlo')}
                                className={`${subButtonBaseClasses} ${futurePlayerType === option.value ? subButtonActiveClasses : subButtonInactiveClasses}`}
                                aria-pressed={futurePlayerType === option.value} >
                                {option.label}
                              </button>
                         ))}
                      </div>
                      {errors.futurePlayerType && <p className={errorClasses}>{errors.futurePlayerType}</p>}
                  </fieldset>
                </div>
           )}

            {/* Conditional Contributor Type Sub-Buttons */}
            {selectedRoles.includes('contributor') && (
                <div className="lg:col-span-2 -mt-2 mb-2 space-y-3">
                  <fieldset>
                      <legend className={`${labelClasses} mb-2 ml-1`}>Contribution Area(s):</legend>
                      <div className="flex flex-wrap gap-2">
                         {contributorTypeOptions.map(option => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleContributorTypeClick(option.value)}
                                className={`${subButtonBaseClasses} ${contributorTypes.includes(option.value) ? subButtonActiveClasses : subButtonInactiveClasses}`}
                                aria-pressed={contributorTypes.includes(option.value)}
                              >
                                {option.label}
                              </button>
                         ))}
                      </div>
                      {errors.contributorTypes && <p className={errorClasses}>{errors.contributorTypes}</p>}
                  </fieldset>

                   {/* Conditional 'Other' Input for Contributor */}
                   {contributorTypes.includes('other_contributor') && (
                     <div>
                       <label htmlFor="otherContributorType" className={`${labelClasses} text-xs`}>If Other Contribution Area, please specify: {requiredStar}</label>
                       <input type="text" id="otherContributorType" value={otherContributorType} onChange={(e) => setOtherContributorType(e.target.value)}
                         className={`${inputClasses} text-xs py-1 ${errors.otherContributorType ? 'border-danger' : ''}`}
                         required
                       />
                       {errors.otherContributorType && <p className={errorClasses}>{errors.otherContributorType}</p>}
                     </div>
                   )}
                </div>
            )}

          {/* Conditional 'Other' Input for main Role */}
          {selectedRoles.includes('other') && (
            <div className="lg:col-span-2">
                <label htmlFor="otherIdentity" className={labelClasses}>Please specify who you are: {requiredStar}</label>
                <input type="text" id="otherIdentity" value={otherIdentity} onChange={handleOtherTextChange}
                    className={`${inputClasses} ${errors.otherIdentity ? 'border-danger' : ''}`} required />
                {errors.otherIdentity && <p id="otheridentity-error" className={errorClasses}>{errors.otherIdentity}</p>}
            </div>
          )}

          {/* Conditional Potential Partner Input */}
          {selectedRoles.includes('potential_partner') && (
            <div className="lg:col-span-2">
              <label htmlFor="partnerSpecification" className={labelClasses}>
                  What kind of potential partner? {requiredStar}
              </label>
              <input
                type="text"
                id="partnerSpecification"
                value={partnerSpecification}
                onChange={handlePartnerSpecChange}
                className={`${inputClasses} ${errors.partnerSpecification ? 'border-danger' : ''}`}
                aria-describedby={errors.partnerSpecification ? 'partnerspec-error' : undefined}
                aria-invalid={!!errors.partnerSpecification}
                required
              />
              {errors.partnerSpecification && <p id="partnerspec-error" className={errorClasses}>{errors.partnerSpecification}</p>}
            </div>
          )}


          {/* --- Other Standard Form Fields --- */}
          {/* Name */}
          <div><label htmlFor="name" className={labelClasses}>Name</label><input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className={`${inputClasses}`} /></div>
          {/* Email */}
          <div>
            <label htmlFor="email" className={labelClasses}>Email Address {(newsletter || selectedRoles.includes('contributor') || selectedRoles.includes('potential_partner')) && requiredStar}</label>
            <input
              type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className={`${inputClasses} ${errors.email ? 'border-danger' : ''}`}
              required={newsletter || selectedRoles.includes('contributor') || selectedRoles.includes('potential_partner')}
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p id="email-error" className={errorClasses}>{errors.email}</p>}
          </div>

          {/* Conditional Amount Fields */}
          {selectedRoles.includes('investor') && ( <div><label htmlFor="investmentAmount" className={labelClasses}>Investment Amount</label><input type="text" id="investmentAmount" value={investmentAmount} onChange={(e) => setInvestmentAmount(e.target.value)} inputMode="decimal" className={`${inputClasses} ${errors.investmentAmount ? 'border-danger' : ''}`} />{errors.investmentAmount && <p id="investment-error" className={errorClasses}>{errors.investmentAmount}</p>}</div> )}
          {selectedRoles.includes('future_player') && ( <div><label htmlFor="playAmount" className={labelClasses}>How much USDC will you play with?</label><input type="text" id="playAmount" value={playAmount} onChange={(e) => setPlayMoney(e.target.value)} inputMode="decimal" className={`${inputClasses} ${errors.playAmount ? 'border-danger' : ''}`} />{errors.playAmount && <p id="property-error" className={errorClasses}>{errors.playAmount}</p>}</div> )}

          {/* Tickboxes Section */}
          <div className="lg:col-span-2">
              <fieldset className="space-y-4">
                  <legend className="sr-only">Options</legend>
                  {/* Newsletter */}
                  <div className="relative flex items-start">
                      <div className="flex h-5 items-center"><input id="newsletter" name="newsletter" type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className={checkboxClasses} /></div>
                      <div className="ml-3 text-sm"><label htmlFor="newsletter" className={checkboxLabelClasses}>Subscribe to Newsletter</label></div>
                  </div>
                  {/* Bounty Airdrop */}
                  <div className="relative flex items-start">
                      <div className="flex h-5 items-center"><input id="bountyAirdrop" name="bountyAirdrop" type="checkbox" checked={bountyAirdrop} onChange={handleBountyCheckboxChange} className={checkboxClasses} /></div>
                      <div className="ml-3 text-sm"><label htmlFor="bountyAirdrop" className={checkboxLabelClasses}>Join the Genesis Program</label></div>
                  </div>

                  {/* Conditional Bounty Fields */}
                  {bountyAirdrop && (
                      <div className="ml-7 space-y-4 pt-2 border-l border-card3 pl-4">
                          {/* ERC-20 Wallet Address */}
                          <div>
                              <label htmlFor="walletAddress" className={labelClasses}>ERC-20 Wallet Address {requiredStar}</label>
                              <input type="text" id="walletAddress" placeholder="0x..." value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)}
                                  className={`${inputClasses} ${errors.walletAddress ? 'border-danger' : ''}`} required
                                  aria-describedby={errors.walletAddress ? 'wallet-error' : undefined} aria-invalid={!!errors.walletAddress} />
                              {errors.walletAddress && <p id="wallet-error" className={errorClasses}>{errors.walletAddress}</p>}
                          </div>
                          {/* Reference Code */}
                          <div>
                              <label htmlFor="referenceCode" className={labelClasses}>Reference Code (Optional)</label>
                              <input type="text" id="referenceCode" value={referenceCode} onChange={handleReferenceCodeChange}
                                  className={`${inputClasses} ${errors.referenceCode ? 'border-danger' : ''}`}
                                  aria-describedby={errors.referenceCode ? 'refcode-error' : undefined} aria-invalid={!!errors.referenceCode} />
                              {errors.referenceCode && <p id="refcode-error" className={errorClasses}>{errors.referenceCode}</p>}
                          </div>
                          {/* Get Own Reference Code Checkbox */}
                          <div className="relative flex items-start">
                              <div className="flex h-5 items-center"><input id="getOwnCode" name="getOwnCode" type="checkbox" checked={getOwnCode} onChange={handleGetOwnCodeChange} className={checkboxClasses} /></div>
                              <div className="ml-3 text-sm"><label htmlFor="getOwnCode" className={checkboxLabelClasses}>I need my own Reference Code</label></div>
                          </div>
                          {/* Conditional Own Reference Code Input */}
                          {getOwnCode && (
                              <div>
                                  <label htmlFor="ownReferenceCode" className={labelClasses}>Enter Desired Reference Code</label>
                                  <input type="text" id="ownReferenceCode" value={ownReferenceCode} onChange={handleOwnReferenceCodeChange}
                                      className={`${inputClasses} ${errors.ownReferenceCode ? 'border-danger' : ''}`}
                                      aria-describedby={errors.ownReferenceCode ? 'owncode-error' : undefined} aria-invalid={!!errors.ownReferenceCode} />
                                  {errors.ownReferenceCode && <p id="owncode-error" className={errorClasses}>{errors.ownReferenceCode}</p>}
                              </div>
                          )}
                      </div>
                  )}
               </fieldset>
          </div>

          {/* Message */}
          <div className="lg:col-span-2" > <label htmlFor="message" className={labelClasses}>Message</label> <textarea placeholder='Is there anything you want to tell us?' id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputClasses}`} /> </div>

       </div> {/* End of grid wrapper */}

       {/* Submit Button */}
       <div> <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-bg bg-primary hover:bg-primary2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"> {isLoading ? (<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : 'Send Message'} </button> </div>
    </form>
  );
};

export default ContactForm;