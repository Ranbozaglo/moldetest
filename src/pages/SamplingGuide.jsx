
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { MoldInspection, Sample } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { getDisplayNumber, validateInspection } from '@/utils/inspectionUtils';
import { getInspectionIdFromUrl } from '@/utils/urlUtils';
import { ArrowRight, FlaskConical, Beaker, MapPin, Paintbrush, Archive, Repeat, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { listSupabaseStorageFiles, supabase } from '@/lib/supabase';

export default function SamplingGuide() {
    const location = useLocation();
    const navigate = useNavigate();
    const [inspectionId, setInspectionId] = useState(null);
    const [inspectionData, setInspectionData] = useState(null);
    const [sampleImages, setSampleImages] = useState([]);
    const [inspectionLoading, setInspectionLoading] = useState(true);
    const [imagesLoading, setImagesLoading] = useState(true);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
    const [imageErrors, setImageErrors] = useState({});
    const [logoErrors, setLogoErrors] = useState({});

    useEffect(() => {
        const id = getInspectionIdFromUrl(location.search);
        
        console.log("🔍 DEBUG: URL search params:", location.search);
        console.log("🔍 DEBUG: Inspection ID from params:", id);
        
        if (id && id.trim() !== '') {
            setInspectionId(id);
            loadInspectionData(id);
            loadSampleImages(); // Load sample images for examples
        } else {
            console.error("No inspection ID found in URL parameters");
            console.log("🔍 DEBUG: Available URL parameters:", new URLSearchParams(location.search).toString());
            // Instead of showing an alert, show a user-friendly error page
            loadSampleImages(); // Still load sample images for guide
            setInspectionLoading(false);
        }
        
        // Cleanup function to reset image errors if component unmounts
        return () => {
            console.log("🔍 DEBUG: SamplingGuide component unmounting, cleaning up state");
            setImageErrors({});
            setLogoErrors({});
        };
    }, [location.search, navigate]);

    const loadInspectionData = async (id) => {
        try {
            setInspectionLoading(true);
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
            setInspectionLoading(false);
        }
    };



    const loadSampleImages = async () => {
        console.log("[SamplingGuide] loadSampleImages called");
        setImagesLoading(true);
        try {
            // Replace staticSampleImages with an array of objects containing sample_image, name, and description
            const sampleImagesWithInfo = [
              {
                sample_image: "https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/sample//Samples9.jpeg",
                name: "Wall Surface Sampling",
                description: "Shows proper Q-tip angle and glove use on wall mold growth."
              },
              {
                sample_image: "https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/sample//Samples7.jpeg",
                name: "Ceiling Sampling",
                description: "Demonstrates sampling technique on ceiling mold growth."
              },
              {
                sample_image: "https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/sample//Samples4.jpeg",
                name: "Air Vent Sampling",
                description: "Shows how to sample from air vents and HVAC components."
              },
              {
                sample_image: "https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/sample//Samples8.jpeg",
                name: "Labeling and Bagging",
                description: "Ensure each bag is clearly labeled with the location before sealing."
              },
              {
                sample_image: "https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/sample//totaltestsample.jpeg",
                name: "Fill out COC",
                description: "Fill out the Chain Of Custody form with your samples location and info"
              },
              {
                sample_image: "https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/sample//Samples6.jpeg",
                name: "Shipping Label",
                description: "Properly stick the shipping label on the envelope and drop it off in any FedEx locations."
              },
            
              // Add more samples as needed
            ];

            console.log(`[SamplingGuide] Static sample image URLs:`, sampleImagesWithInfo);

            setSampleImages(sampleImagesWithInfo);
        } catch (error) {
            console.error("[SamplingGuide] Fatal error in loadSampleImages:", error);
            setSampleImages([]);
        } finally {
            setImagesLoading(false);
            console.log("[SamplingGuide] loadSampleImages finished");
        }
    };

    // Logo component with proper error handling
    const LogoImage = ({ size = "w-8 h-8", logoId = "default", fallbackText = "MTH" }) => {
        return (
            <>
                {!logoErrors[logoId] ? (
                    <img 
                        src="https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/mold.images/uploads/logos.png" 
                        alt="Mold Testing Houston Logo" 
                        className={`${size} object-contain`}
                        onError={(e) => {
                            console.log(`🔍 DEBUG: Logo load error for ${logoId}`);
                            // Prevent further error propagation
                            e.preventDefault();
                            
                            // Use functional update to avoid race conditions
                            setLogoErrors(prev => {
                                const newErrors = { ...prev };
                                newErrors[logoId] = true;
                                return newErrors;
                            });
                        }}
                        onLoad={() => {
                            console.log(`🔍 DEBUG: Logo loaded successfully for ${logoId}`);
                        }}
                    />
                ) : (
                    <div className={`${size} bg-amber-200 rounded flex items-center justify-center text-xs text-amber-700 font-bold ${logoId === 'disclaimer-small' ? 'flex-shrink-0 mt-1' : ''}`}>
                        {fallbackText}
                    </div>
                )}
            </>
        );
    };
    
    if (inspectionLoading || imagesLoading) {
        return <div className="text-center p-12">Loading Collection Guide...</div>
    }

    if (!inspectionData && !inspectionLoading) {
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
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                            <LogoImage size="w-8 h-8" logoId="disclaimer-main" fallbackText="MTH" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Important Disclaimer</h1>
                        <p className="text-lg text-slate-600">
                            Please read and acknowledge the following before proceeding.
                        </p>
                    </div>

                    <div className="glass-effect p-8 rounded-2xl mb-8 border-2 border-amber-200">
                        <div className="flex items-start gap-3 mb-6">
                            <LogoImage size="w-6 h-6" logoId="disclaimer-small" fallbackText="MTH" />
                            <h2 className="text-xl font-bold text-slate-900">Disclaimer</h2>
                        </div>
                        
                        <div className="space-y-4 text-slate-700 leading-relaxed">
                            <p>
                                Total Testing DIY Mold Test Kit is intended as a preliminary screening tool to help individuals identify the possible presence of mold in their environment. It is not a substitute for a licensed mold assessment, professional inspection, or full indoor air quality evaluation as defined by state or federal regulations.
                            </p>
                            
                            <p>
                                This service is designed to provide basic laboratory analysis and a summary report based on surface sampling. The results and interpretations are intended for informational purposes only and do not constitute legal, environmental, or medical advice.
                            </p>
                            
                            <p>
                                If elevated mold levels are detected, or if there are known health concerns, water damage, or visible mold growth, we strongly recommend a licensed mold assessment by a certified professional in accordance with your state's regulations.
                            </p>
                            
                            <p className="font-medium">
                                By purchasing and using this kit, the user acknowledges and agrees that Total Testing is not liable for decisions made based on this preliminary testing, and that the DIY kit is best used as an initial "first-aid" tool to gain awareness and guide next steps.
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
                        <img src="/logos.png" alt="Logo" className="w-8 h-8 object-contain" />
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
                        Here are examples of proper sample collection technique from previous inspections. Notice the use of disposable gloves and proper sampling positioning.
                    </p>
                    
                    {sampleImages.length > 0 ? (
                        <div className="sample-images-grid" style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '3rem',
                          marginTop: 24
                        }}>
                          {sampleImages.map((sample, idx) => (
                            <div key={sample.sample_image} style={{
                              background: '#f9fafb',
                              border: '1px solid #e5e7eb',
                              borderRadius: 12,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'stretch',
                              justifyContent: 'stretch',
                              overflow: 'hidden',
                              minWidth: 0
                            }}>
                              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <img
                                  src={sample.sample_image}
                                  alt={sample.name}
                                  style={{
                                    width: '100%',
                                    height: 300,
                                    objectFit: 'cover',
                                    borderTopLeftRadius: 12,
                                    borderTopRightRadius: 12,
                                    marginBottom: 0,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
                                  }}
                                />
                              </div>
                             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 16, width: '100%', textAlign: 'left' }}>
                               <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 18 }}>{sample.name}</div>
                               <div style={{ color: '#6b7280', fontSize: 16 }}>{sample.description}</div>
                             </div>
                            </div>
                          ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                            <FlaskConical className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                            <p className="text-slate-600 font-medium mb-2">No Sample Examples Available Yet</p>
                            <p className="text-sm text-slate-500 max-w-md mx-auto">
                                Sample collection examples will appear here as other users complete their inspections. 
                                Follow the step-by-step instructions above for proper collection technique.
                            </p>
                        </div>
                    )}
                </div>
         
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
