import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
        Privacy Policy
      </h1>

      <div className="space-y-6 text-gray-700 dark:text-gray-300">
        <div>
          <p className="text-sm mb-4">
            <strong>Last updated:</strong> {new Date().toLocaleDateString()}
          </p>
        </div>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            1. Introduction
          </h2>
          <p className="leading-relaxed">
            This Privacy Policy explains how Sudhamrit Inventory Management App ("we," "our," or "us") 
            collects, uses, and protects your personal information when you use our inventory management application.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            2. Information We Collect
          </h2>
          <div className="space-y-3">
            <h3 className="font-medium">Personal Information:</h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>Name and contact information</li>
              <li>Username and password (encrypted)</li>
              <li>Email address</li>
              <li>Role and permission settings</li>
            </ul>
            
            <h3 className="font-medium">Business Information:</h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>Product information and inventory data</li>
              <li>Stock transaction records</li>
              <li>Purchase and sales order data</li>
              <li>Business analytics and reports</li>
            </ul>
            
            <h3 className="font-medium">Technical Information:</h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>Device information and IP address</li>
              <li>Browser type and version</li>
              <li>Usage patterns and preferences</li>
              <li>Session and authentication tokens</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            3. How We Use Your Information
          </h2>
          <ul className="list-disc ml-6 space-y-2">
            <li>To provide and maintain our inventory management services</li>
            <li>To authenticate users and manage access permissions</li>
            <li>To process and track inventory transactions</li>
            <li>To generate business reports and analytics</li>
            <li>To improve our application features and user experience</li>
            <li>To send important notifications about your account or inventory</li>
            <li>To comply with legal obligations and business requirements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            4. Data Storage and Security
          </h2>
          <ul className="list-disc ml-6 space-y-2">
            <li>All data is stored securely using encrypted databases</li>
            <li>Passwords are hashed using industry-standard bcrypt encryption</li>
            <li>Session data is protected with secure authentication tokens</li>
            <li>Regular security audits and updates are performed</li>
            <li>Access to data is restricted based on user roles and permissions</li>
            <li>Data backups are encrypted and stored securely</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            5. Data Sharing and Disclosure
          </h2>
          <p className="leading-relaxed">
            We do not sell, trade, or otherwise transfer your personal information to third parties. 
            We may share information only in the following circumstances:
          </p>
          <ul className="list-disc ml-6 space-y-2 mt-3">
            <li>With your explicit consent</li>
            <li>To comply with legal requirements or court orders</li>
            <li>To protect our rights, property, or safety</li>
            <li>With service providers who assist in app maintenance (under strict confidentiality agreements)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            6. Data Retention
          </h2>
          <p className="leading-relaxed">
            We retain your personal information for as long as necessary to provide our services 
            and comply with legal obligations. Inventory data is typically retained for business 
            and accounting purposes as required by law. You may request deletion of your personal 
            data, subject to legal and business requirements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            7. Your Rights
          </h2>
          <p className="leading-relaxed">You have the right to:</p>
          <ul className="list-disc ml-6 space-y-2 mt-3">
            <li>Access and review your personal information</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your personal data (subject to legal requirements)</li>
            <li>Export your data in a portable format</li>
            <li>Withdraw consent for data processing (where applicable)</li>
            <li>Lodge complaints with relevant data protection authorities</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            8. Cookies and Tracking
          </h2>
          <p className="leading-relaxed">
            Our application uses session cookies to maintain user authentication and preferences. 
            These cookies are essential for app functionality and are automatically deleted when 
            you log out or close the browser. We do not use third-party tracking cookies or 
            advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            9. Children's Privacy
          </h2>
          <p className="leading-relaxed">
            Our application is designed for business use and is not intended for children under 
            13 years of age. We do not knowingly collect personal information from children 
            under 13. If we become aware that we have collected such information, we will 
            delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            10. International Data Transfers
          </h2>
          <p className="leading-relaxed">
            Your information may be processed and stored on servers located outside your 
            country of residence. We ensure appropriate safeguards are in place to protect 
            your information during international transfers, in compliance with applicable 
            data protection laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            11. Changes to This Privacy Policy
          </h2>
          <p className="leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any 
            material changes by posting the new Privacy Policy in the application and updating 
            the "Last updated" date. Your continued use of the application after changes 
            constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            12. Contact Us
          </h2>
          <p className="leading-relaxed">
            If you have any questions about this Privacy Policy or our data practices, 
            please contact us:
          </p>
          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p><strong>Email:</strong> apps@sudhastar.com</p>
            <p><strong>Address:</strong> opp.sri ma vidyalaya,patlipada,thane(west)</p>
            <p className="text-sm mt-2">
              We will respond to privacy-related inquiries within 30 days.
            </p>
          </div>
        </section>

        <section className="border-t pt-6 mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            This Privacy Policy complies with Google Play Store requirements and applicable 
            data protection regulations including GDPR and CCPA where applicable.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;