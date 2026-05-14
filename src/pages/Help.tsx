import React, { useState } from 'react';
import { 
  Search, 
  MessageCircle, 
  Mail, 
  Phone, 
  MapPin, 
  ChevronDown, 
  ChevronUp,
  Send,
  ExternalLink,
  Book,
  Shield,
  Zap
} from 'lucide-react';

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        className="w-full py-6 flex items-center justify-between text-left focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-lg font-medium text-gray-900">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-indigo-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="pb-6">
          <p className="text-gray-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

const Help: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const faqs = [
    {
      question: "How do I set up my CCTV cameras?",
      answer: "Setting up your cameras is easy. Go to the 'Live' section, click on 'Add Camera', and follow the on-screen instructions. Make sure your camera is on the same network as your device."
    },
    {
      question: "What should I do if an alert is triggered?",
      answer: "When an alert is triggered, you will receive a notification via SMS or call (depending on your settings). You can view the live stream immediately or check the 'Recordings' section for the event video."
    },
    {
      question: "How can I change my emergency contact?",
      answer: "You can update your emergency contact details in the 'Settings' page under the 'Alert Configuration' section."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, all video streams and recordings are encrypted end-to-end. We use industry-standard security protocols to ensure your data remains private and secure."
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-xl text-gray-500 mb-8 font-medium">
            Search our knowledge base or get in touch with our support team.
          </p>
          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for articles, guides..."
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-xl text-gray-900 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none shadow-sm transition-all"
              />
            </div>
          </div>
        </div>
        {/* Quick Links */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Book className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Knowledge Base</h3>
            <p className="text-gray-600 mb-4">Detailed guides and documentation for all features.</p>
            <button className="text-blue-600 font-medium flex items-center hover:underline">
              Browse Articles <ExternalLink className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Security & Privacy</h3>
            <p className="text-gray-600 mb-4">Learn how we protect your data and privacy.</p>
            <button className="text-green-600 font-medium flex items-center hover:underline">
              Read More <ExternalLink className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Getting Started</h3>
            <p className="text-gray-600 mb-4">New to our platform? Start here for a quick tour.</p>
            <button className="text-purple-600 font-medium flex items-center hover:underline">
              Quick Guide <ExternalLink className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* FAQ Section */}
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden px-8">
              {faqs.map((faq, index) => (
                <FAQItem key={index} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Contact Info</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4 shrink-0">
                  <Mail className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Email Us</h4>
                  <p className="text-gray-600">support@securityvision.com</p>
                  <p className="text-gray-600 text-sm mt-1">We'll respond within 24 hours.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4 shrink-0">
                  <Phone className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Call Us</h4>
                  <p className="text-gray-600">+1 (555) 123-4567</p>
                  <p className="text-gray-600 text-sm mt-1">Mon-Fri from 8am to 6pm EST.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4 shrink-0">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Office</h4>
                  <p className="text-gray-600">123 Security Avenue</p>
                  <p className="text-gray-600">Tech City, TC 54321</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4 shrink-0">
                  <MessageCircle className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Live Chat</h4>
                  <button className="text-indigo-600 font-medium hover:underline">Start a chat with our team</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form Section */}
        <div className="mt-20 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-12 lg:p-16 bg-indigo-600 text-white flex flex-col justify-center">
              <h2 className="text-4xl font-bold mb-6">Send us a message</h2>
              <p className="text-xl text-indigo-100 mb-8 leading-relaxed">
                Have a specific question or technical issue? Our dedicated support team is ready to help you get the most out of your security system.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  <p className="text-indigo-100">Average response time: &lt; 2 hours</p>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  <p className="text-indigo-100">24/7 technical monitoring</p>
                </div>
              </div>
            </div>
            <div className="p-12 lg:p-16">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Send className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600 mb-8">Thank you for reaching out. We've received your message and will get back to you shortly.</p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                      placeholder="Technical Support"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                    <textarea
                      required
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                      placeholder="Tell us how we can help..."
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center ${
                      isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {isSubmitting ? (
                      'Sending...'
                    ) : (
                      <>
                        Send Message <Send className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;

