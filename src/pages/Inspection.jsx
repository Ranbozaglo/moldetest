
import React, { useState, useEffect } from "react";
import { MoldInspection } from "@/api/entities";
import { User } from "@/api/entities";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/lib/supabase';

// Debug: Check if MoldInspection is properly imported
console.log("🔍 DEBUG: MoldInspection import check:", {
  MoldInspection,
  hasList: typeof MoldInspection?.list === 'function',
  methods: MoldInspection ? Object.keys(MoldInspection) : 'undefined'
});
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getDisplayNumber, validateInspection, getNextInspectionNumber } from "@/utils/inspectionUtils";

import PersonalInfoStep from "../components/inspection/PersonalInfoStep";
import PropertyInfoStep from "../components/inspection/PropertyInfoStep";
import MoldDetectionStep from "../components/inspection/MoldDetectionStep";
import WaterDamageStep from "../components/inspection/WaterDamageStep";
import ThermostatStep from "../components/inspection/ThermostatStep";
import ReviewStep from "../components/inspection/ReviewStep";

const steps = [
  { id: 1, title: "Personal Information", component: PersonalInfoStep },
  { id: 2, title: "Property Details", component: PropertyInfoStep },
  { id: 3, title: "Mold Detection", component: MoldDetectionStep },
  { id: 4, title: "Water Damage Assessment", component: WaterDamageStep },
  { id: 5, title: "Environmental Conditions", component: ThermostatStep },
  { id: 6, title: "Review & Submit", component: ReviewStep },
  { id: 7, title: "Sample Collection", component: null }
];

export default function Inspection() {
  // Debug: Check for any global variables that might interfere
  if (typeof window !== 'undefined') {
    console.log("🔍 DEBUG: Global variables check:", {
      window_mt: window.mt,
      window_MoldInspection: window.MoldInspection
    });
  }
  
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    client_type: "",
    property_type: "",
    street_address: "",
    unit_number: "",
    city: "",
    state: "",
    zip_code: "",
    square_footage: "",
    background_info: "",
    has_visible_mold: false,
    visible_mold_details: [],
    has_water_damage: false,
    water_damage_details: [],
    thermostat_image: "",
    temperature: "",
    humidity: "",
    environmental_data_method: "manual"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [newInspection, setNewInspection] = useState(null);

  useEffect(() => {
    const checkUserAndPreloadData = async () => {
      try {
        // Use the current user from AuthContext
        if (currentUser && currentUser.email) {
          console.log("🔍 DEBUG: User authenticated:", currentUser.email);
          
          // Pre-fill the form with user data
          setFormData(prev => ({
            ...prev,
            email: currentUser.email,
            full_name: currentUser.name || currentUser.email.split('@')[0]
          }));
          
          // Check for existing inspections
          try {
            const existingInspections = await MoldInspection.findMany({ user_id: currentUser.id });
            if (existingInspections && existingInspections.length > 0) {
              console.log("🔍 DEBUG: Found existing inspections:", existingInspections.length);
              // You could show a message or handle existing inspections here
            }
          } catch (error) {
            console.log("🔍 DEBUG: No existing inspections or error checking:", error);
          }
        } else {
          console.log("🔍 DEBUG: No authenticated user found");
          navigate(createPageUrl('SignIn'));
          return;
        }
      } catch (error) {
        console.error("🔍 DEBUG: Error checking user:", error);
        navigate(createPageUrl('SignIn'));
      } finally {
        setCheckingExisting(false);
      }
    };

    checkUserAndPreloadData();
  }, [navigate, currentUser]); // Added currentUser to dependency array

  const updateFormData = (data) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      console.log("🔍 DEBUG: Form data before submission:", formData);
      console.log("🔍 DEBUG: MoldInspection object:", MoldInspection);
      console.log("🔍 DEBUG: MoldInspection.list method:", typeof MoldInspection.list);
      console.log("🔍 DEBUG: Available methods on MoldInspection:", Object.keys(MoldInspection));
      console.log("🔍 DEBUG: MoldInspection constructor:", MoldInspection.constructor);
      console.log("🔍 DEBUG: MoldInspection prototype:", Object.getPrototypeOf(MoldInspection));
      
      // Debug the MoldInspection object
      if (MoldInspection.debug) {
        MoldInspection.debug();
      }
      
      // Check if list method exists
      if (typeof MoldInspection.list !== 'function') {
        throw new Error(`MoldInspection.list is not a function. Available methods: ${Object.keys(MoldInspection).join(', ')}`);
      }
      
      // Check if there's any global mt variable
      if (typeof window !== 'undefined' && window.mt) {
        console.log("🔍 DEBUG: Found global mt variable:", window.mt);
      }
      
      // Check if there's any code that might be creating an alias
      const globalVars = Object.keys(window).filter(key => key.includes('mt') || key.includes('inspection'));
      console.log("🔍 DEBUG: Global variables with 'mt' or 'inspection':", globalVars);
      
      // Check if MoldInspection is being aliased somewhere
      if (typeof window !== 'undefined') {
        for (const key in window) {
          if (window[key] && typeof window[key] === 'object' && window[key].list) {
            console.log("🔍 DEBUG: Found object with 'list' method:", key, window[key]);
          }
        }
      }
      
      // Fetch the latest inspection to determine the next inspection number
      const latestInspections = await MoldInspection.list('-inspection_number', 1); // Fetches one item sorted by inspection_number descending
      const nextInspectionNumber = getNextInspectionNumber(latestInspections);
      
      console.log("🔍 DEBUG: Next inspection number will be:", nextInspectionNumber);

      // Forcefully get the logged-in user's email to ensure it's correct
      console.log("🔍 DEBUG: Current user from AuthContext:", currentUser);
      
      if (!currentUser || !currentUser.email) {
        throw new Error("Could not verify user. Please log in again.");
      }

      console.log("🔍 DEBUG: Email from form:", formData.email);
      console.log("🔍 DEBUG: Email from currentUser:", currentUser.email);

      const submissionData = {
        ...formData,
        email: currentUser.email, // This guarantees the correct email is saved
        square_footage: parseFloat(formData.square_footage),
        // Don't manually assign inspection_number - let the database trigger handle it
        // inspection_number: nextInspectionNumber,
        client_status_detail: "Inspection submitted - awaiting sample collection",
        created_date: new Date().toISOString() // Add the current date
      };

      // Convert temperature and humidity to numbers if they exist
      if (formData.temperature !== "") {
        submissionData.temperature = parseFloat(formData.temperature);
      }
      if (formData.humidity !== "") {
        submissionData.humidity = parseFloat(formData.humidity);
      }

      // Get Supabase session for created_by
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user || !session.user.email) {
        throw new Error('Could not get Supabase session or user email.');
      }
      submissionData.created_by = session.user.email;

      // Now log the true final data
      console.log("🔍 DEBUG: Final submission data:", submissionData);

      const newInspection = await MoldInspection.create(submissionData);
      console.log("🔍 DEBUG: Created inspection object:", newInspection);
      console.log("🔍 DEBUG: Inspection ID:", newInspection?.id);
      console.log("🔍 DEBUG: Inspection number:", newInspection?.inspection_number);
      console.log("🔍 DEBUG: Inspection type:", typeof newInspection);
      console.log("🔍 DEBUG: Inspection keys:", newInspection ? Object.keys(newInspection) : 'null');
      
      // Validate the created inspection
      const validation = validateInspection(newInspection);
      if (!validation.isValid) {
        console.error("🔍 DEBUG: Inspection validation failed:", validation.errors);
        throw new Error(`Inspection validation failed: ${validation.errors.join(', ')}`);
      }
      
      if (newInspection && newInspection.id) {
          console.log(`🔍 DEBUG: Successfully created inspection with ID:`, newInspection.id);
          console.log(`🔍 DEBUG: Inspection number assigned:`, newInspection.inspection_number);
          console.log(`🔍 DEBUG: Display number:`, getDisplayNumber(newInspection));
          
          // If the trigger didn't assign an inspection_number, update it manually
          if (!newInspection.inspection_number) {
              console.log("🔍 DEBUG: No inspection_number assigned by trigger, updating manually...");
              try {
                  const updatedInspection = await MoldInspection.update(newInspection.id, {
                      inspection_number: nextInspectionNumber
                  });
                  console.log("🔍 DEBUG: Updated inspection with number:", updatedInspection);
                  setNewInspection(updatedInspection);
              } catch (updateError) {
                  console.error("🔍 DEBUG: Failed to update inspection number:", updateError);
                  // Continue with the original inspection object
                  setNewInspection(newInspection);
              }
          } else {
              // Store the new inspection result
              setNewInspection(newInspection);
          }
          
          console.log("🔍 DEBUG: Set newInspection state to:", newInspection);
          // Move to the next step (step 7) instead of navigating directly
          setCurrentStep(7);
      } else {
          // This case handles if creation fails to return a valid object with an ID
          console.error("🔍 DEBUG: Invalid inspection response:", newInspection);
          throw new Error(`Failed to create inspection or retrieve a valid ID. Response: ${JSON.stringify(newInspection)}`);
      }

    } catch (error) {
      console.error("🔍 DEBUG: Error submitting inspection:", error);
      alert("Failed to submit inspection. Please try again.");
    }
    setIsSubmitting(false);
  };

  if (checkingExisting) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-6">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep - 1].component;
  const progressPercentage = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl("Welcome")} className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Home
          </Link>
          
          <div className="glass-effect rounded-2xl p-6 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              Mold Inspection & Testing Process
            </h1>
            
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-600">
                  Step {currentStep} of {steps.length}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            
            {/* Step Indicators */}
            <div className="hidden md:flex justify-between items-center">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-300 ${
                    currentStep > step.id 
                      ? 'bg-green-500 text-white' 
                      : currentStep === step.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-200 text-slate-500'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-1 mx-2 rounded-full transition-all duration-300 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="glass-effect rounded-2xl p-8 mb-8"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            {steps[currentStep - 1].title}
          </h2>
          
          {CurrentStepComponent ? (
            <CurrentStepComponent
              formData={formData}
              updateFormData={updateFormData}
              onNext={nextStep}
              onPrev={prevStep}
              isFirstStep={currentStep === 1}
              isLastStep={currentStep === steps.length}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              user={currentUser}
            />
          ) : (
            <div className="text-center py-10">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Report Created!</h3>
              <p className="text-slate-600 text-lg">
                Your inspection details have been submitted successfully.
              </p>
              <p className="text-slate-600 text-lg mt-1">
                Please proceed to the Sample Collection guide.
              </p>
              <Button 
                onClick={() => {
                  console.log("🔍 DEBUG: Button clicked, newInspection state:", newInspection);
                  console.log("🔍 DEBUG: newInspection?.id:", newInspection?.id);
                  if (newInspection?.id) {
                    console.log("🔍 DEBUG: Navigating to SamplingGuide with ID:", newInspection.id);
                    // Use consistent parameter name (lowercase for better compatibility)
                    navigate(createPageUrl(`SamplingGuide?inspectionid=${newInspection.id}`));
                  } else {
                    console.error("🔍 DEBUG: No inspection ID available for navigation");
                    alert("Error: Inspection ID not found. Please try submitting the inspection again.");
                  }
                }} 
                disabled={!newInspection?.id} 
                className="mt-6 px-8 py-3 text-lg"
              >
                Go to Sampling Guide
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
