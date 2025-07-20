
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { MoldInspection } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { getDisplayNumber, validateInspection } from '@/utils/inspectionUtils';
import { getInspectionIdFromUrl } from '@/utils/urlUtils';
import { ArrowRight, FlaskConical, Beaker, ShieldQuestion, MapPin, Paintbrush, Archive, Repeat, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SamplingGuide() {
    const location = useLocation();
    const navigate = useNavigate();
    const [inspectionId, setInspectionId] = useState(null);
    const [inspectionData, setInspectionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

    useEffect(() => {
        const id = getInspectionIdFromUrl(location.search);
        
        console.log("🔍 DEBUG: URL search params:", location.search);
        console.log("🔍 DEBUG: Inspection ID from params:", id);
        
        if (id && id.trim() !== '') {
            setInspectionId(id);
            loadInspectionData(id);
        } else {
            console.error("No inspection ID found in URL parameters");
            console.log("🔍 DEBUG: Available URL parameters:", new URLSearchParams(location.search).toString());
            // Instead of showing an alert, show a user-friendly error page
            setLoading(false);
        }
    }, [location.search, navigate]);

    const loadInspectionData = async (id) => {
        try {
            console.log("🔍 DEBUG: Loading inspection data for ID:", id);
            const data = await MoldInspection.findUnique({ id });
            console.log("🔍 DEBUG: Loaded inspection data:", data);
            
            if (data && data.id) {
                // Validate the inspection data
                const validation = validateInspection(data);
                if (!validation.isValid) {
                    console.error("🔍 DEBUG: Inspection validation failed:", validation.errors);
                    setInspectionData(null);
                    return;
                }
                
                console.log("🔍 DEBUG: Inspection display number:", getDisplayNumber(data));
                setInspectionData(data);
            } else {
                console.error("🔍 DEBUG: No inspection data found for ID:", id);
                setInspectionData(null);
            }
        } catch (error) {
            console.error("Failed to load inspection data for guide:", error);
            setInspectionData(null);
        } finally {
            setLoading(false);
        }
    };
    
    if (loading) {
        return <div className="text-center p-12">Loading Collection Guide...</div>
    }

    if (!inspectionData) {
        return (
          <div className="max-w-2xl mx-auto text-center py-20 px-6">
            <h2 className="text-xl text-red-600 mb-4">
              {!inspectionId ? "No Inspection ID Found" : "Error Loading Data"}
            </h2>
            <p className="text-slate-600 mb-6">
              {!inspectionId 
                ? "This page requires a valid inspection ID. However, you can still view the sampling guide for reference."
                : "We couldn't load the necessary inspection data to display this guide. Please return home and try starting the inspection again."
              }
            </p>
            <div className="flex gap-4 justify-center">
              <Link to={createPageUrl("Welcome")}>
                  <Button variant="outline">Back to Home</Button>
              </Link>
              {!inspectionId && (
                <Button 
                  onClick={() => setInspectionData({})} // Set empty object to show guide
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  View Guide Anyway
                </Button>
              )}
            </div>
          </div>
        );
    }

    // Show disclaimer first
    if (!disclaimerAccepted) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <img 
                                src="https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/mold.images/uploads/logo.jpeg" 
                                alt="Mold Testing Houston Logo" 
                                className="w-8 h-8 object-contain"
                            />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Important Disclaimer</h1>
                        <p className="text-lg text-slate-600">
                            Please read and acknowledge the following before proceeding.
                        </p>
                    </div>

                    <div className="glass-effect p-8 rounded-2xl mb-8 border-2 border-amber-200">
                        <div className="flex items-start gap-3 mb-6">
                            <img 
                                src="https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/mold.images/uploads/logo.jpeg" 
                                alt="Mold Testing Houston Logo" 
                                className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1 object-contain"
                            />
                            <h2 className="text-xl font-bold text-slate-900">Disclaimer</h2>
                        </div>
                        
                        <div className="space-y-4 text-slate-700 leading-relaxed">
                            <p>
                                The Mold Testing Houston DIY Mold Test Kit is intended as a preliminary screening tool to help individuals identify the possible presence of mold in their environment. It is not a substitute for a licensed mold assessment, professional inspection, or full indoor air quality evaluation as defined by state or federal regulations.
                            </p>
                            
                            <p>
                                This service is designed to provide basic laboratory analysis and a summary report based on surface sampling. The results and interpretations are intended for informational purposes only and do not constitute legal, environmental, or medical advice.
                            </p>
                            
                            <p>
                                If elevated mold levels are detected, or if there are known health concerns, water damage, or visible mold growth, we strongly recommend a licensed mold assessment by a certified professional in accordance with your state's regulations.
                            </p>
                            
                            <p className="font-medium">
                                By purchasing and using this kit, the user acknowledges and agrees that Mold Testing Houston, LLC is not liable for decisions made based on this preliminary testing, and that the DIY kit is best used as an initial "first-aid" tool to gain awareness and guide next steps.
                            </p>
                        </div>
                    </div>

                    <div className="text-center">
                        <Button
                            onClick={() => setDisclaimerAccepted(true)}
                            size="lg"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-xl text-lg font-medium"
                        >
                            <CheckCircle className="w-5 h-5 mr-3" />
                            I Agree & Continue to Collection Guide
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const guideSteps = [
        { title: "Preparation: Label Your Bags", description: "Put on disposable gloves. Before sampling, use a Sharpie to clearly label each Ziploc bag with the specific location you plan to sample (e.g., 'Bathroom Ceiling Behind Toilet').", icon: Beaker },
        { title: "Swabbing with a Q-tip", description: "Take a fresh Q-tip. Firmly press and rub one cotton end across the visible mold, rotating the Q-tip to ensure the tip is thoroughly coated. A 2x2 inch area is ideal.", icon: Paintbrush },
        { title: "Bag the Sample", description: "Carefully place the entire Q-tip inside its corresponding, pre-labeled Ziploc bag. Press the air out and seal the bag completely to prevent any cross-contamination.", icon: Archive },
        { title: "Repeat for Each Location", description: "Crucially, you must use a new Q-tip and a new, separately labeled Ziploc bag for each different area you sample. Never reuse materials.", icon: Repeat }
    ];

    const hasVisibleMold = inspectionData && inspectionData.has_visible_mold && inspectionData.visible_mold_details && inspectionData.visible_mold_details.length > 0;

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="text-center mb-12">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldQuestion className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Guide: Collecting Swab Samples</h1>
                    <p className="text-lg text-slate-600">
                        Follow these steps carefully to ensure accurate lab results.
                    </p>
                </div>
                
                <div className="glass-effect p-8 rounded-2xl mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Step-by-Step Collection Process</h2>
                    <div className="space-y-6">
                        {guideSteps.map((step, index) => (
                            <motion.div key={index} className="flex items-start gap-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                                <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center">
                                    <step.icon className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">{step.title}</h3>
                                    <p className="text-slate-600">{step.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="glass-effect p-8 rounded-2xl mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Sample Collection Examples</h2>
                    <p className="text-slate-600 mb-6">
                        Here are examples of proper sample collection technique. Notice the use of disposable gloves and proper Q-tip positioning.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <img 
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/5f765e25e_WhatsAppImage2025-05-11at64111AM.jpg"
                                alt="Proper Q-tip sampling technique on wall mold"
                                className="w-full h-48 object-cover rounded-xl border border-slate-200"
                            />
                            <p className="text-sm text-slate-600 font-medium">Wall Surface Sampling</p>
                            <p className="text-xs text-slate-500">Shows proper Q-tip angle and glove use on wall mold growth</p>
                        </div>
                        <div className="space-y-3">
                            <img 
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6011d36e7_WhatsAppImage2023-01-16at54603PM11.jpeg"
                                alt="Ceiling mold sampling with Q-tip"
                                className="w-full h-48 object-cover rounded-xl border border-slate-200"
                            />
                            <p className="text-sm text-slate-600 font-medium">Ceiling Sampling</p>
                            <p className="text-xs text-slate-500">Demonstrates sampling technique on ceiling mold growth</p>
                        </div>
                        <div className="space-y-3">
                            <img 
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/3481aec58_WhatsAppImage2023-02-14at50555PM3.jpeg"
                                alt="Air vent sampling technique"
                                className="w-full h-48 object-cover rounded-xl border border-slate-200"
                            />
                            <p className="text-sm text-slate-600 font-medium">Air Vent Sampling</p>
                            <p className="text-xs text-slate-500">Shows how to sample from air vents and HVAC components</p>
                        </div>
                        <div className="space-y-3">
                            <img 
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d1808efb8_ChatGPTImageJul2202512_29_47PM.png"
                                alt="Properly labeled and bagged sample"
                                className="w-full h-48 object-contain rounded-xl border border-slate-200" // Updated: object-cover -> object-contain
                            />
                            <p className="text-sm text-slate-600 font-medium">Labeling and Bagging</p>
                            <p className="text-xs text-slate-500">Ensure each bag is clearly labeled with the location before sealing.</p>
                        </div>
                        <div className="space-y-3">
                            <img 
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/5df3d80ff_ChatGPTImageJul2202501_45_05PM.png"
                                alt="Shipping label on envelope"
                                className="w-full h-48 object-cover rounded-xl border border-slate-200"
                            />
                            <p className="text-sm text-slate-600 font-medium">Shipping Label Example</p>
                            <p className="text-xs text-slate-500">Example of properly addressed shipping label for Mold Testing Houston</p>
                        </div>
                    </div>
                </div>

                {hasVisibleMold && (
                    <div className="glass-effect p-8 rounded-2xl mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Your Identified Mold Locations to Sample</h2>
                        <p className="text-slate-600 mb-4">You will need to collect one sample from each of the following locations you identified earlier:</p>
                        <ul className="space-y-3">
                            {inspectionData && inspectionData.visible_mold_details && inspectionData.visible_mold_details.map((detail, index) => (
                                <li key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                    <MapPin className="w-5 h-5 text-red-500 flex-shrink-0" />
                                    <span className="font-medium text-slate-700">{detail.location}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div className="bg-amber-50 rounded-xl p-6 border border-amber-100 mb-8">
                    <h3 className="font-semibold text-amber-900 mb-2">Important Reminders</h3>
                    <ul className="text-amber-800 text-sm list-disc list-inside space-y-1">
                        <li>Label the Ziploc bag *before* you take the sample.</li>
                        <li>Do not touch the cotton end of the Q-tip with your fingers.</li>
                        <li>Ensure the Ziploc bag is sealed completely to prevent contamination.</li>
                        <li>If you did not report any visible mold, you may proceed without collecting swab samples.</li>
                    </ul>
                </div>
                
                <div className="flex justify-end">
                    <Link to={createPageUrl(`Sampling?inspectionId=${inspectionId}`)}>
                        <Button
                          size="lg"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium"
                        >
                          Continue to Sample Documentation
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
