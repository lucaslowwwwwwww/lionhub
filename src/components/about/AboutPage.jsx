import React, { useState } from 'react';
import { useOrg } from '../../hooks/useOrg';

// Legal Content based on the drafted documents
const TERMS_CONTENT = `
*Last Updated: 7 May 2026*

### 1. Acceptance of Terms
By accessing or using the Lionhub platform ("the Platform"), you agree to be bound by these Terms of Service. If you are registering on behalf of a Lion or Dragon Dance association, troupe, or club, you represent and warrant that you have the legal authority to bind said entity to this agreement. **If you disagree with any part of these terms, you must immediately cease all access to the Platform and discontinue the use of our management services.**

### 2. Roles and Data Responsibility
*   **Data Controller**: Your association remains the Data Controller at all times. By inputting member contact details and customer information into Lionhub, you warrant that you have obtained explicit consent from those individuals to manage their data in a cloud-based management system.
*   **Data Processor**: Lionhub acts solely as the Data Processor, providing the secure software infrastructure and tools required to store, organize, and manage your operational data.

### 3. Acceptable Use
Lionhub is designed exclusively for the professional management of cultural arts troupe operations, deployments, and finances. Users agree not to:
*   Attempt to breach or circumvent the Platform's security architectures.
*   Reverse-engineer, decompile, or disassemble any portion of the software.
*   Use the system for any illegal activities or unauthorized data harvesting.

### 4. Subscriptions and Payments
*   Access to the Platform requires an active annual or half-yearly subscription.
*   Payments are settled via direct bank transfer or authorized payment gateways.
*   **Suspension**: Failure to renew a subscription will result in automatic account suspension. Access to database records will be restricted until all outstanding payments are settled.

### 5. Disclaimer of Warranties & Limitation of Liability
**THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.**
To the maximum extent permitted by applicable law, in no event shall Lionhub or its developer, Low Phak Hey, be liable for any direct, indirect, incidental, special, exemplary, or consequential damages (including, but not limited to, loss of data, loss of bookings, loss of performance revenue, or business interruption) however caused and on any theory of liability, whether in contract, strict liability, or tort arising in any way out of the use of this software, even if advised of the possibility of such damage.

### 6. Indemnification
You agree to defend, indemnify, and hold harmless Lionhub and Low Phak Hey from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including but not limited to attorney's fees) arising from: (i) your use of and access to the Platform; (ii) your violation of any term of these Terms of Service; (iii) your violation of any third-party right, including without limitation any copyright, property, or privacy right (such as PDPA violations by inputting unauthorized member or customer data).

### 7. Intellectual Property
All content, features, database schemas, code, visual designs, and software functionalities of the Platform are and will remain the exclusive property of Lionhub and its developer. You are strictly prohibited from copying, modifying, distributing, reverse-engineering, or using any part of our platform for competitive benchmarking or unauthorized commercial purposes.

### 8. Governing Law
These terms shall be governed by and construed in accordance with the laws of Malaysia.
`;

const PRIVACY_CONTENT = `
*Last Updated: 7 May 2026*

### 1. Introduction
Lionhub is committed to protecting your troupe's operational and personal data in strict compliance with the **Personal Data Protection Act 2010 (PDPA)** of Malaysia.

### 2. Data Collection Scope
We securely store the following operational information provided by your committee:
*   **Account Credentials**: Committee names, emails, and phone numbers.
*   **Troupe Personnel**: Member names and contact details for deployment tracking.
*   **Client Records**: Customer names, performance addresses, and contact numbers.
*   **Financial Records**: Invoices, quotes, and troupe financial entries.
*   *Note: Lionhub explicitly does not collect or store highly sensitive personal documents, such as NRIC copies or bank passwords.*

### 3. Utilization of Information
Your data is used strictly to operate the Lionhub platform, including:
*   Facilitating performance scheduling and itinerary management.
*   Tracking member deployments and availability.
*   Generating financial reports and invoices.
*   Sending critical system alerts and subscription updates.

### 4. Data Isolation and Security
Your data is hosted using enterprise-grade PostgreSQL cloud infrastructure. We implement strict **Row Level Security (RLS)** protocols. This ensures that your association’s records are completely isolated; it is technically impossible for another troupe or unauthorized third party to view or access your data.

### 5. Non-Disclosure Guarantee
Lionhub will never sell, rent, or share your association's operational data, client lists, or financial records with any third parties, marketing agencies, or competing associations.

### 6. Rights of Access (PDPA)
Under the PDPA, your association has the right to request access to, correct, or export the data stored on our platform at any time.

### 7. Local Storage & Sub-processors
*   **Local Storage**: To maintain secure sessions and remember your layout preferences (such as Dark Mode), the Platform utilizes local browser storage (LocalStorage/SessionStorage). No marketing or tracking cookies are used.
*   **Sub-processors**: We utilize world-class, secure third-party sub-processors (such as Supabase and AWS) to host the cloud database and manage emails. These services operate under strict compliance standards to ensure your data remains isolated and encrypted at all times.
`;

const REFUND_CONTENT = `
*Last Updated: 7 May 2026*

### 1. Subscription Cancellations
Users may cancel their Lionhub subscription at any time by notifying support or opting not to renew a pending annual/half-yearly invoice. Access will remain active until the end of the current paid billing cycle.

### 2. No Prorated Refunds
Because Lionhub reserves dedicated server infrastructure and database resources for your association immediately upon payment, we do not offer prorated refunds for mid-cycle cancellations.

### 3. The 12-Month Seasonal Archive (Grace Period)
We recognize the seasonal nature of the Lion Dance industry. If a subscription lapses:
*   **Secure Archive**: Your account and all operational history will be placed into a "Frozen Archive" for exactly 12 months.
*   **Reactivation**: Renewing within this 12-month window will instantly restore all your data exactly as it was.

### 4. Permanent Data Purge
If an account remains inactive and unpaid for more than 12 consecutive months, all data associated with the troupe will be permanently and irreversibly deleted from our servers to ensure continuous data privacy.

### 5. Data Export Prior to Expiration
We strongly encourage all treasurers and troupe masters to utilize the built-in **Export Tools** to download member lists and financial records prior to allowing a subscription to expire.

### 6. Subscription Pricing Adjustment
We reserve the right to adjust subscription rates or introduce new payment tiers at any time. Any changes in pricing will be communicated to your primary master admin email at least 30 days in advance, allowing you ample time to cancel or modify your subscription prior to the changes taking effect.
`;

// Helper component to render simple markdown
function MarkdownRenderer({ content }) {
  const parseMarkdown = (text) => {
    const lines = text.trim().split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('### ')) {
        return (
          <h3 key={index} className="text-[15px] font-black text-surface-50 mt-10 mb-4 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-crimson-500 shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
            {line.replace('### ', '')}
          </h3>
        );
      }
      if (line.startsWith('*   ')) {
        let text = line.replace('*   ', '');
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
        text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
        return (
          <div key={index} className="flex gap-3 mb-3 ml-2 group">
            <div className="w-1.5 h-1.5 rounded-full bg-surface-300 mt-2 shrink-0 group-hover:bg-crimson-500 transition-colors" />
            <p className="text-sm text-surface-50 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
          </div>
        );
      }
      if (line.trim() === '') {
        return <div key={index} className="h-2" />;
      }
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
      formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
      return <p key={index} className="text-sm text-surface-50 mb-5 leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
    });
  };

  return <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">{parseMarkdown(content)}</div>;
}

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState('account');
  const { org } = useOrg();

  const tabs = [
    { id: 'account', label: 'About Your Account' },
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'terms', label: 'Terms of Service' },
    { id: 'refunds', label: 'Cancellation & Refund Policy' }
  ];

  // Helper to safely format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Not Available';
    try {
      return new Date(dateString).toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Safe checks for subscription expiry (fallback to default if undefined)
  const dateJoined = org?.created_at ? formatDate(org.created_at) : 'Not Available';
  const subExpires = org?.expires_at ? formatDate(org.expires_at) : 'Lifetime / Active';
  
  return (
    <div className="w-full space-y-6 animate-fade-in">
          
          <header className="mb-6 lg:mb-10">
            <h1 className="text-2xl md:text-3xl font-black text-surface-50 uppercase tracking-tight">About & Legal</h1>
            <p className="text-[11px] font-bold text-surface-500 uppercase tracking-widest mt-1">
              Account Information and Platform Policies
            </p>
          </header>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            
            {/* Sidebar Tabs */}
            <div className="w-full lg:w-64 shrink-0">
              <div className="sticky top-8 flex flex-row lg:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-4 lg:pb-0 border-b border-surface-800/50 lg:border-none">
                {tabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center text-left px-5 py-3.5 rounded-xl transition-all duration-300 group whitespace-nowrap ${
                        isActive
                          ? 'bg-crimson-500/10'
                          : 'hover:bg-surface-800/40'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 inset-y-2.5 w-1 rounded-r-full bg-crimson-500 shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                      )}
                      <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${
                        isActive ? 'text-crimson-400' : 'text-surface-400 group-hover:text-surface-100'
                      }`}>
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              <div className="bg-surface-900/40 border border-surface-800/60 backdrop-blur-sm rounded-3xl lg:rounded-[2rem] p-5 md:p-8 lg:p-10 shadow-2xl min-h-[600px]">
                
                {/* Account Tab */}
                {activeTab === 'account' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Header */}
                    <div className="flex items-center gap-5 mb-10 pb-8 border-b border-surface-800/50">
                      <div className="w-20 h-20 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xl relative group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-surface-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                        {org?.logo_url ? (
                          <img src={org.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-surface-400 text-3xl font-black">{org?.name_en?.[0] || 'L'}</span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-surface-50 tracking-tight">{org?.name_en || 'Lionhub Account'}</h2>
                        <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 rounded-md bg-crimson-500/10 border border-crimson-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-crimson-500 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse" />
                          <span className="text-[9px] font-black text-crimson-400 uppercase tracking-widest">Active Subscriber</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="bg-surface-950/50 border border-surface-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-surface-700 transition-colors">
                        <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-4">Date Joined</p>
                        <p className="text-xl font-bold text-surface-100 tracking-tight">{dateJoined}</p>
                      </div>

                      <div className="bg-surface-950/50 border border-surface-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-surface-700 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-crimson-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-[10px] font-black text-crimson-500 uppercase tracking-widest mb-4 relative z-10">Subscription Expiration</p>
                        <p className="text-xl font-bold text-surface-100 tracking-tight relative z-10">{subExpires}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy Tab */}
                {activeTab === 'privacy' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-10">
                      <h2 className="text-2xl font-black text-surface-50 uppercase tracking-tight mb-3">Privacy Policy</h2>
                      <div className="w-12 h-1 rounded-full bg-crimson-600" />
                    </div>
                    <MarkdownRenderer content={PRIVACY_CONTENT} />
                  </div>
                )}

                {/* Terms Tab */}
                {activeTab === 'terms' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-10">
                      <h2 className="text-2xl font-black text-surface-50 uppercase tracking-tight mb-3">Terms of Service</h2>
                      <div className="w-12 h-1 rounded-full bg-crimson-600" />
                    </div>
                    <MarkdownRenderer content={TERMS_CONTENT} />
                  </div>
                )}

                {/* Refunds Tab */}
                {activeTab === 'refunds' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-10">
                      <h2 className="text-2xl font-black text-surface-50 uppercase tracking-tight mb-3">Cancellation & Refund Policy</h2>
                      <div className="w-12 h-1 rounded-full bg-crimson-600" />
                    </div>
                    <MarkdownRenderer content={REFUND_CONTENT} />
                  </div>
                )}

              </div>
            </div>
          </div>
    </div>
  );
}
