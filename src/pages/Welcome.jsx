
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, FileText, Camera, User } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const handleStartInspection = () => {
    if (user) {
      navigate(createPageUrl("Inspection"));
    } else {
      navigate(createPageUrl("SignIn"));
    }
  };
  
  const features = [
    {
      icon: CheckCircle,
      title: "Professional Assessment",
      description: "Get expert-level mold detection results from the comfort of your home"
    },
    {
      icon: Clock,
      title: "Quick Process",
      description: "Complete your inspection in just 10-15 minutes with our guided process"
    },
    {
      icon: FileText,
      title: "Detailed Report",
      description: "Receive comprehensive analysis and recommendations for your property"
    },
    {
      icon: Camera,
      title: "Visual Documentation",
      description: "Upload photos for thorough visual assessment and evidence"
    }
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10" />
        
        <div className="max-w-7xl mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <img 
                src="https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/mold.images/uploads/logo.jpeg" 
                alt="Mold Testing Houston Logo" 
                className="w-4 h-4 object-contain"
              />
              Total Testing - Your Mold Experts!
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-8 leading-tight">
              Start Your
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> NEW Mold Inspection</span>
              <br />& Testing Today
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed">
              Professional-grade mold detection and assessment made simple. 
              Get peace of mind about your property's air quality in minutes.
            </p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
                <Button 
                onClick={handleStartInspection}
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-12 py-6 text-xl font-semibold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                >
                  <img 
                    src="https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/mold.images/uploads/logo.jpeg" 
                    alt="Mold Testing Houston Logo" 
                    className="w-6 h-6 mr-3 object-contain"
                  />
                  Start NEW Mold Inspection & Testing
                </Button>
            </motion.div>
            
            <p className="text-slate-500 mt-6 text-sm">
              ✓ Clear and professional report • ✓ Certified Lab Results • ✓ 10-minute process
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Why Choose Our DIY Testing?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Professional-grade assessment tools and methodologies, 
              simplified for homeowners and property managers.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-effect rounded-2xl p-8 text-center group hover:shadow-xl transition-all duration-300"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 to-blue-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Test Your Property?
            </h2>
            <p className="text-xl text-blue-100 mb-10">
              Join thousands of homeowners who trust Total Testing .
            </p>
              <Button 
              onClick={handleStartInspection}
                size="lg" 
                className="bg-white text-blue-900 hover:bg-blue-50 px-12 py-6 text-xl font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                Begin NEW Inspection Process
              </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
