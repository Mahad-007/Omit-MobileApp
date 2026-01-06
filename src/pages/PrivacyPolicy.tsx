import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Database, Lock, Users, Clock, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: January 2025</p>
        </div>

        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Introduction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Omit ("we," "our," or "us") operates the Omit productivity service, including our browser extension and web application. We are committed to protecting your personal data and your right to privacy.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. By using Omit, you agree to the collection and use of information in accordance with this policy.
            </p>
            <p>
              If you have any questions or concerns about this policy or our practices, please contact us using the information provided at the end of this document.
            </p>
          </CardContent>
        </Card>

        {/* Age Restrictions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Age Restrictions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately so we can take appropriate action.
            </p>
            <p>
              Users between the ages of 13 and 18 should review this Privacy Policy with their parent or guardian to ensure they understand it.
            </p>
          </CardContent>
        </Card>

        {/* Data We Collect */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">1. Account Information</h3>
              <p className="mb-2">When you create an account, we collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Name and email address</li>
                <li>Username and encrypted password</li>
                <li>Profile information you choose to provide</li>
                <li>Authentication tokens for secure session management</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">2. Usage Data</h3>
              <p className="mb-2">We automatically collect certain information when you use our Service:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>IP address and browser type</li>
                <li>Device information and operating system</li>
                <li>Session duration and feature engagement</li>
                <li>Aggregated productivity statistics (e.g., focus time saved)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">3. Blocking & Productivity Data</h3>
              <p className="mb-2">To provide our core functionality:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your personal blocklist of websites</li>
                <li>Focus session settings and preferences</li>
                <li>Task lists and productivity goals</li>
              </ul>
              <p className="mt-2 text-sm text-muted-foreground">
                <strong>Important:</strong> All URL checking and blocking decisions happen locally on your device. We do NOT track, store, or transmit your browsing history to our servers.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">4. Payment Information</h3>
              <p>
                If you make a purchase, payment information is processed securely through our third-party payment processors. We do not store complete credit card numbers on our servers.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Your Data */}
        <Card>
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service Delivery:</strong> To provide, operate, and maintain the core functionality of blocking distracting websites and tracking productivity.</li>
              <li><strong>Account Management:</strong> To create and manage your account, authenticate your identity, and maintain secure login sessions.</li>
              <li><strong>Synchronization:</strong> To sync your settings, tasks, and blocked lists between the web application and browser extension.</li>
              <li><strong>Service Improvement:</strong> To understand how users interact with our Service and improve functionality.</li>
              <li><strong>Communication:</strong> To send you important updates, security alerts, and support messages.</li>
              <li><strong>Fraud Prevention:</strong> To detect, prevent, and address technical issues, fraud, or security concerns.</li>
            </ul>
            <p className="font-medium mt-4">
              We do not sell, trade, or rent your personal identification information to third parties.
            </p>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Data Retention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>We retain your information for as long as necessary to fulfill the purposes outlined in this Privacy Policy:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data:</strong> Retained for the duration of your account plus 30 days after deletion request.</li>
              <li><strong>Transaction Records:</strong> Kept for 7 years for legal and accounting purposes.</li>
              <li><strong>Analytics Data:</strong> Aggregated analytics are preserved for up to 24 months.</li>
              <li><strong>Usage Logs:</strong> System logs are retained for 90 days for security and debugging purposes.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <CardTitle>Your Privacy Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal obligations.</li>
              <li><strong>Portability:</strong> Request transfer of your data in a machine-readable format.</li>
              <li><strong>Objection:</strong> Object to processing of your personal data for certain purposes.</li>
              <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances.</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please contact us using the information provided below. We will respond to your request within 30 days.
            </p>
          </CardContent>
        </Card>

        {/* Third-Party Services */}
        <Card>
          <CardHeader>
            <CardTitle>Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>We may share your information with third-party service providers who assist us in operating our Service:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Infrastructure Providers:</strong> Cloud hosting and storage services.</li>
              <li><strong>Payment Processors:</strong> Secure payment processing services.</li>
              <li><strong>Analytics Services:</strong> To help us understand usage patterns and improve our Service.</li>
              <li><strong>Authentication Providers:</strong> For secure sign-in options (e.g., Google, social login).</li>
            </ul>
            <p className="mt-4">
              All third-party service providers are contractually bound by data protection agreements and are only permitted to use your data as necessary to provide services to us.
            </p>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>We implement industry-standard security measures to protect your personal information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Encryption:</strong> All data is transmitted using TLS/SSL encryption.</li>
              <li><strong>Access Controls:</strong> Role-based access controls limit data access to authorized personnel only.</li>
              <li><strong>Secure Storage:</strong> Passwords are hashed using industry-standard algorithms.</li>
              <li><strong>Regular Audits:</strong> We conduct regular security assessments and updates.</li>
              <li><strong>Automated Backups:</strong> Regular backups ensure data recovery in case of incidents.</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              While we strive to protect your personal information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </CardContent>
        </Card>

        {/* Cookies */}
        <Card>
          <CardHeader>
            <CardTitle>Cookies and Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We use cookies and similar tracking technologies to enhance your experience on our Service. Cookies are small data files stored on your device.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for the Service to function properly (e.g., authentication).</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use our Service.</li>
            </ul>
            <p className="mt-4">
              You can control cookies through your browser settings. Note that disabling certain cookies may affect the functionality of our Service.
            </p>
          </CardContent>
        </Card>

        {/* Policy Changes */}
        <Card>
          <CardHeader>
            <CardTitle>Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
            <p>
              We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information. Your continued use of the Service after any changes constitutes acceptance of the updated policy.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <ul className="list-none space-y-2">
              <li><strong>Email:</strong> mahadghafoor.07@gmail.com</li>
              <li><strong>Support:</strong> Available through the application's help section</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              We aim to respond to all privacy-related inquiries within 30 days. If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
