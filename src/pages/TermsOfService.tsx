import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, UserCheck, Ban, Scale, CreditCard, AlertTriangle, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
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
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: January 2025</p>
        </div>

        {/* Acceptance of Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              1. Acceptance of Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Welcome to Omit. By accessing or using our browser extension, web application, and related services (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms").
            </p>
            <p>
              If you do not agree to these Terms, you may not access or use the Service. Your continued use of the Service constitutes acceptance of any updates or modifications to these Terms.
            </p>
            <p>
              We reserve the right to modify these Terms at any time. Material changes will be communicated through the Service or via email. Your continued use after such changes constitutes acceptance of the new Terms.
            </p>
          </CardContent>
        </Card>

        {/* Description of Service */}
        <Card>
          <CardHeader>
            <CardTitle>2. Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Omit provides productivity and focus management tools, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Website blocking functionality to help you stay focused</li>
              <li>Focus session tracking and productivity statistics</li>
              <li>Task management and goal setting features</li>
              <li>Cross-device synchronization via browser extension and web application</li>
              <li>Motivational content and productivity insights</li>
            </ul>
            <p className="mt-4">
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice.
            </p>
          </CardContent>
        </Card>

        {/* Account Registration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              3. Account Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>To use certain features of the Service, you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be at least 13 years of age (or the minimum age in your jurisdiction)</li>
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your login credentials secure and confidential</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate accounts that violate these Terms or for any other reason at our sole discretion.
            </p>
          </CardContent>
        </Card>

        {/* Acceptable Use */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              4. Acceptable Use Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You agree NOT to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable laws, regulations, or third-party rights</li>
              <li>Upload or transmit malware, viruses, or other harmful code</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated scripts, bots, or scrapers without permission</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Impersonate any person or entity</li>
              <li>Circumvent any security features or access restrictions</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
            </ul>
            <p className="mt-4">
              Violation of this policy may result in immediate termination of your account and access to the Service.
            </p>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card>
          <CardHeader>
            <CardTitle>5. Intellectual Property Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The Service, including its original content, features, and functionality, is owned by Omit and is protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              We grant you a limited, non-exclusive, non-transferable, revocable license to use the Service for personal, non-commercial purposes in accordance with these Terms.
            </p>
            <p>You may not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Copy, modify, or distribute any part of the Service</li>
              <li>Reverse engineer or attempt to extract the source code</li>
              <li>Remove any copyright or proprietary notices</li>
              <li>Use our trademarks without prior written consent</li>
              <li>Create derivative works based on the Service</li>
            </ul>
          </CardContent>
        </Card>

        {/* User Content */}
        <Card>
          <CardHeader>
            <CardTitle>6. User Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              You retain ownership of any content you create or upload to the Service, including tasks, settings, and preferences ("User Content").
            </p>
            <p>
              By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to use, store, and process your User Content solely for the purpose of providing and improving the Service.
            </p>
            <p>You represent and warrant that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You own or have the right to use your User Content</li>
              <li>Your User Content does not violate any third-party rights</li>
              <li>Your User Content complies with these Terms and applicable laws</li>
            </ul>
            <p className="mt-4">
              We reserve the right to remove any User Content that violates these Terms without notice.
            </p>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>7. Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Your privacy is important to us. Our collection and use of personal information is governed by our{" "}
              <Link to="/privacy" className="text-primary hover:underline font-medium">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference.
            </p>
            <p>
              By using the Service, you consent to the collection and use of your information as described in the Privacy Policy.
            </p>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              8. Payment Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Certain features of the Service may require payment. If you choose to use paid features:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subscription fees are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable unless otherwise stated</li>
              <li>You authorize us to charge your payment method for recurring fees</li>
              <li>Upon cancellation, you retain access until the end of your billing period</li>
              <li>We reserve the right to modify pricing with reasonable notice</li>
            </ul>
            <p className="mt-4">
              Failure to pay may result in suspension or termination of your access to paid features.
            </p>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card>
          <CardHeader>
            <CardTitle>9. Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              You may terminate your account at any time by contacting us or using the account deletion feature in Settings.
            </p>
            <p>
              We may suspend or terminate your account immediately, without prior notice, if:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You breach any provision of these Terms</li>
              <li>We are required to do so by law</li>
              <li>We discontinue the Service</li>
              <li>We believe your actions may cause legal liability</li>
            </ul>
            <p className="mt-4">
              Upon termination, your right to use the Service ceases immediately. We may delete your User Content following termination in accordance with our data retention policies.
            </p>
          </CardContent>
        </Card>

        {/* Disclaimers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              10. Disclaimers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-medium">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
            </p>
            <p>We disclaim all warranties, including but not limited to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Merchantability and fitness for a particular purpose</li>
              <li>Non-infringement of third-party rights</li>
              <li>Accuracy, reliability, or completeness of content</li>
              <li>Uninterrupted or error-free operation</li>
              <li>Security or freedom from viruses or harmful components</li>
            </ul>
            <p className="mt-4">
              We do not guarantee that the Service will help you achieve any specific productivity goals. Results may vary based on individual use.
            </p>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              11. Limitation of Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, OMIT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Loss of profits, data, or goodwill</li>
              <li>Service interruption or computer damage</li>
              <li>Cost of substitute services</li>
              <li>Any damages arising from your use of the Service</li>
            </ul>
            <p className="mt-4">
              Our total liability for any claims arising from or related to these Terms or the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or $100, whichever is greater.
            </p>
          </CardContent>
        </Card>

        {/* Indemnification */}
        <Card>
          <CardHeader>
            <CardTitle>12. Indemnification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              You agree to indemnify, defend, and hold harmless Omit and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, or expenses (including reasonable attorneys' fees) arising from:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Your User Content</li>
            </ul>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card>
          <CardHeader>
            <CardTitle>13. Governing Law & Dispute Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Omit operates, without regard to conflict of law principles.
            </p>
            <p>
              Any disputes arising from these Terms or the Service shall be resolved through:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Informal Resolution:</strong> We encourage you to contact us first to resolve disputes amicably.</li>
              <li><strong>Binding Arbitration:</strong> If informal resolution fails, disputes shall be resolved through binding arbitration.</li>
              <li><strong>Class Action Waiver:</strong> You agree to resolve disputes individually and waive any right to participate in class actions.</li>
            </ul>
          </CardContent>
        </Card>

        {/* General Provisions */}
        <Card>
          <CardHeader>
            <CardTitle>14. General Provisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and Omit regarding the Service.</li>
              <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in effect.</li>
              <li><strong>Waiver:</strong> Our failure to enforce any right does not constitute a waiver of that right.</li>
              <li><strong>Assignment:</strong> You may not assign these Terms without our consent. We may assign our rights freely.</li>
              <li><strong>Force Majeure:</strong> We are not liable for delays caused by circumstances beyond our reasonable control.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              15. Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <ul className="list-none space-y-2">
              <li><strong>Email:</strong> mahadghafoor.07@gmail.com</li>
              <li><strong>Support:</strong> Available through the application's help section</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              We will make reasonable efforts to respond to your inquiries in a timely manner.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
