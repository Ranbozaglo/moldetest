import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, Package, Clock, Home } from "lucide-react";
import { motion } from "framer-motion";
import { User } from "@/api/entities";
import { MoldInspection } from "@/api/entities";
import { useAuth } from "@/contexts/AuthContext";

export default function ThankYou() {
  const [userInspection, setUserInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const loadUserInspection = async () => {
      try {
        if (currentUser && currentUser.email) {
          // Find the most recent inspection by this user
          const inspections = await MoldInspection.filter({ email: currentUser.email }, '-created_date', 1);
          if (inspections && inspections.length > 0) {
            setUserInspection(inspections[0]);
          }
        }
      } catch (error) {
        console.log("User not logged in or no inspections found");
      } finally {
        setLoading(false);
      }
    };

    loadUserInspection();
  }, [currentUser]);

  const getDisplayNumber = (inspection) => {
    return inspection?.inspection_number ? `MTH #${inspection.inspection_number}` : `MTH #${inspection?.id}`;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-6">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Thank You!</h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Your mold inspection has been successfully submitted and processed.
          </p>
          {userInspection && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-blue-800 font-medium">
                Inspection Reference: {getDisplayNumber(userInspection)}
              </p>
              <p className="text-blue-700 text-sm mt-1">
                Keep this reference number for your records
              </p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass-effect rounded-2xl p-6 text-center"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Check Your Email</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              We've sent you a Chain of Custody form and shipping label. 
              Please check your email inbox (and spam folder) in the next few minutes.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-effect rounded-2xl p-6 text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Prepare Your Samples</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Follow the collection guide you received and prepare your samples 
              for shipping using the provided materials and instructions.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="glass-effect rounded-2xl p-6 text-center"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Await Results</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Once we receive your samples, lab analysis typically takes 3-5 business days. 
              We'll email you the detailed report upon completion.
            </p>
          </motion.div>
        </div>

        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200 mb-8">
          <h3 className="font-semibold text-amber-900 mb-3">Important Reminders</h3>
          <ul className="text-amber-800 text-sm space-y-2">
            <li>• <strong>Email:</strong> Check your email for the Chain of Custody form and shipping label</li>
            <li>• <strong>Samples:</strong> Ship your samples as soon as possible for accurate results</li>
            <li>• <strong>Questions:</strong> Contact us if you need assistance with sample collection or shipping</li>
            <li>• <strong>Timeline:</strong> Lab results will be emailed within 3-5 business days of sample receipt</li>
          </ul>
        </div>

        <div className="text-center">
          <Link to={createPageUrl("Welcome")}>
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium"
            >
              <Home className="w-5 h-5 mr-2" />
              Return to Home
            </Button>
          </Link>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            Need help? Contact Mold Testing Houston support for assistance.
          </p>
        </div>
      </motion.div>
    </div>
  );
}