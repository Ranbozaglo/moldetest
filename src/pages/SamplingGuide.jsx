
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { MoldInspection, Sample } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { getDisplayNumber, validateInspection } from '@/utils/inspectionUtils';
import { getInspectionIdFromUrl } from '@/utils/urlUtils';
import { ArrowRight, FlaskConical, Beaker, ShieldQuestion, MapPin, Paintbrush, Archive, Repeat, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { listSupabaseStorageFiles, supabase } from '@/lib/supabase';

export default function SamplingGuide() {
    const location = useLocation();
    const navigate = useNavigate();
    const [inspectionId, setInspectionId] = useState(null);
    const [inspectionData, setInspectionData] = useState(null);
    const [sampleImages, setSampleImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

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

    // Test function to verify storage access
    const testStorageAccess = async () => {
        try {
            console.log("🧪 STORAGE TEST: Testing direct access to storage URL");
            const testUrl = "https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/sample/";
            
            // Test the specific image URL you provided (now from root path)
            const specificImageUrl = "https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/sample/Samples1.jpeg";
            console.log("🧪 STORAGE TEST: Testing specific image:", specificImageUrl);
            
            try {
                const imageResponse = await fetch(specificImageUrl);
                console.log("🧪 STORAGE TEST: Specific image response status:", imageResponse.status);
                console.log("🧪 STORAGE TEST: Specific image content type:", imageResponse.headers.get('content-type'));
                console.log("🧪 STORAGE TEST: Specific image size:", imageResponse.headers.get('content-length'));
                
                if (imageResponse.ok) {
                    console.log("✅ STORAGE TEST: Specific image is accessible!");
                    
                    // Create a test image directly
                    const testSampleImage = {
                        id: 'test_sample',
                        sample_image: specificImageUrl,
                        location: 'Test Sample Location',
                        description: 'Direct test image (Samples1.jpeg)',
                        name: 'Samples1.jpeg'
                    };
                    
                    console.log("🧪 STORAGE TEST: Created test sample image:", testSampleImage);
                    
                    // Set this as a fallback if nothing else works
                    window.testSampleImage = testSampleImage;
                }
            } catch (imageError) {
                console.error("🧪 STORAGE TEST: Specific image test failed:", imageError);
            }
            
            // Test the Supabase client configuration
            console.log("🧪 STORAGE TEST: Supabase client URL:", supabase.supabaseUrl);
            console.log("🧪 STORAGE TEST: Testing with Supabase client...");
            
            // Test if we can list buckets
            const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
            if (bucketsError) {
                console.error("🧪 STORAGE TEST: Error listing buckets:", bucketsError);
            } else {
                console.log("🧪 STORAGE TEST: Available buckets:", buckets?.map(b => b.name));
            }
            
        } catch (testError) {
            console.error("🧪 STORAGE TEST: Test failed:", testError);
        }
    };

    const loadSampleImages = async () => {
        try {
            console.log("🔍 DEBUG: Loading sample images from Supabase storage bucket");
            console.log("🔍 DEBUG: Expected storage URL format:", "https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/sample/");
            
            // Run storage test first
            await testStorageAccess();
            
            // First, let's try to test if we can access the bucket at all
            console.log("🔍 DEBUG: Testing bucket access...");
            
            try {
                // Fetch all files from the root path of 'sample' bucket
                console.log("🔍 DEBUG: Fetching files from sample bucket root path...");
                const { data: files, error } = await supabase.storage.from('sample').list('', { limit: 100 });
                
                if (error) {
                    console.error("❌ DEBUG: Error fetching files from sample bucket:", error);
                    throw error;
                }
                console.log("✅ DEBUG: Successfully accessed sample bucket");
                console.log("🔍 DEBUG: Found files in sample bucket root:", files);
                console.log("🔍 DEBUG: Total files found:", files?.length || 0);
                
                if (!files || files.length === 0) {
                    console.log("⚠️ DEBUG: No files found in sample bucket root");
                    console.log("🔍 DEBUG: Sample bucket appears to be empty");
                }
                
                // Show all files and their properties for debugging
                if (files && files.length > 0) {
                    files.forEach((file, index) => {
                        console.log(`🔍 DEBUG: File ${index + 1}:`, {
                            name: file.name,
                            size: file.metadata?.size,
                            type: file.metadata?.mimetype,
                            lastModified: file.updated_at
                        });
                        
                        // Test the public URL for each file
                        const { data: urlData } = supabase.storage
                            .from('sample')
                            .getPublicUrl(file.name);
                        console.log(`🔍 DEBUG: File ${index + 1} public URL:`, urlData.publicUrl);
                    });
                }
                
                // Filter for images that contain "samples" in their name and are image files (FIXED: case insensitive)
                const sampleFiles = files?.filter(file => {
                    const fileName = file.name.toLowerCase();
                    const originalFileName = file.name; // Keep original for logging
                    const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
                                   fileName.endsWith('.png') || fileName.endsWith('.webp') || 
                                   fileName.endsWith('.gif');
                    const isSampleImage = fileName.includes('samples') || fileName.includes('sample');
                    
                    console.log("🔍 DEBUG: Checking file:", originalFileName, "→", fileName, "isImage:", isImage, "isSampleImage:", isSampleImage);
                    return isImage && isSampleImage;
                }) || [];
                
                console.log("🔍 DEBUG: Filtered sample files:", sampleFiles);
                console.log("🔍 DEBUG: Number of sample files found:", sampleFiles.length);
                
                // EMERGENCY FALLBACK: If no sample files found, show ALL image files temporarily
                if (sampleFiles.length === 0) {
                    console.log("⚠️ DEBUG: No files with 'sample' in name found, showing ALL images for debugging");
                    
                    const allImageFiles = files?.filter(file => {
                        const fileName = file.name.toLowerCase();
                        const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
                                       fileName.endsWith('.png') || fileName.endsWith('.webp') || 
                                       fileName.endsWith('.gif');
                        
                        console.log("🔍 DEBUG: All images check - file:", file.name, "isImage:", isImage);
                        return isImage;
                    }) || [];
                    
                    console.log("🔍 DEBUG: All image files found:", allImageFiles.length);
                    
                    if (allImageFiles.length > 0) {
                        console.log("🔍 DEBUG: All image file names:", allImageFiles.map(f => f.name));
                        
                        // Use all images as samples for now
                        const allImagesAsSamples = allImageFiles.map((file, index) => {
                            const { data: urlData } = supabase.storage
                                .from('sample')
                                .getPublicUrl(file.name);
                            
                            console.log(`🔍 DEBUG: Creating sample ${index + 1} from file:`, file.name, "URL:", urlData.publicUrl);
                            
                            return {
                                id: `all_image_${index}`,
                                sample_image: urlData.publicUrl,
                                location: `Image ${index + 1}: ${file.name}`,
                                description: `Available image (${file.name}) - using as sample example`,
                                name: file.name
                            };
                        }).slice(0, 6);
                        
                        console.log("✅ DEBUG: Using all images as samples:", allImagesAsSamples);
                        setSampleImages(allImagesAsSamples);
                        return;
                    } else {
                        // Ultimate fallback - use the specific image we know exists
                        console.log("🚨 DEBUG: No images found via API, using direct URL test");
                        if (window.testSampleImage) {
                            console.log("✅ DEBUG: Using test sample image from direct URL test");
                            setSampleImages([window.testSampleImage]);
                            return;
                        }
                    }
                }
                
                // Convert to format expected by the component with public URLs
                const sampleImagesWithUrls = sampleFiles.map((file, index) => {
                    const { data: urlData } = supabase.storage
                        .from('sample')
                        .getPublicUrl(file.name);
                    
                    console.log(`🔍 DEBUG: Creating sample image ${index + 1} with URL:`, urlData.publicUrl);
                    
                    // Extract a readable location name from the filename
                    const baseName = file.name.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
                    const locationName = baseName
                        .replace(/samples?/gi, '') // Remove "sample" or "samples"
                        .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
                        .replace(/\d+/g, '') // Remove numbers
                        .trim()
                        .replace(/\s+/g, ' ') || `Sample Location ${index + 1}`;
                    
                    return {
                        id: `sample_${index}`,
                        sample_image: urlData.publicUrl,
                        location: locationName.charAt(0).toUpperCase() + locationName.slice(1), // Capitalize first letter
                        description: `Example sample image (${file.name}) showing proper collection technique`,
                        name: file.name
                    };
                }).slice(0, 6); // Limit to 6 images for display
                
                console.log("✅ DEBUG: Final sample images with URLs:", sampleImagesWithUrls);
                setSampleImages(sampleImagesWithUrls);
                
            } catch (storageError) {
                console.error("❌ Storage access error:", storageError);
                throw storageError;
            }
            
        } catch (error) {
            console.error("❌ Failed to load sample images from storage:", error);
            console.log("🔄 Falling back to database samples...");
            
            // Fallback to original method if storage fails
            try {
                const samples = await Sample.findMany({});
                const samplesWithImages = samples.filter(sample => 
                    sample.sample_image && 
                    sample.sample_image.trim() !== '' &&
                    sample.location && 
                    sample.description
                ).slice(0, 6);
                
                console.log("🔍 DEBUG: Fallback - loaded database samples:", samplesWithImages);
                setSampleImages(samplesWithImages);
            } catch (fallbackError) {
                console.error("❌ Fallback also failed:", fallbackError);
                
                // FINAL FAILSAFE: Use the specific image we know exists
                console.log("🚨 FINAL FAILSAFE: Using known working image URL");
                const knownWorkingImage = {
                    id: 'failsafe_sample',
                    sample_image: 'https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/sample/Samples1.jpeg',
                    location: 'Sample Collection Example',
                    description: 'Example sample image (Samples1.jpeg) showing proper collection technique',
                    name: 'Samples1.jpeg'
                };
                
                console.log("✅ FINAL FAILSAFE: Setting known working image:", knownWorkingImage);
                setSampleImages([knownWorkingImage]);
            }
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
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = '<div class="w-8 h-8 bg-amber-200 rounded flex items-center justify-center text-xs text-amber-700 font-bold">MTH</div>';
                                }}
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
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = '<div class="w-6 h-6 bg-amber-200 rounded flex items-center justify-center text-xs text-amber-700 font-bold flex-shrink-0 mt-1">MTH</div><h2 class="text-xl font-bold text-slate-900">Disclaimer</h2>';
                                }}
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
                        Here are examples of proper sample collection technique from previous inspections. Notice the use of disposable gloves and proper sampling positioning.
                    </p>
                    
                    {sampleImages.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sampleImages.map((sample, index) => (
                                <div key={index} className="space-y-3">
                                    <img 
                                        src={sample.sample_image}
                                        alt={`Sample collection at ${sample.location}`}
                                        className="w-full h-48 object-cover rounded-xl border border-slate-200"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextElementSibling.style.display = 'block';
                                        }}
                                    />
                                    <div className="w-full h-48 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 text-sm" style={{display: 'none'}}>
                                        Image temporarily unavailable
                                    </div>
                                    <p className="text-sm text-slate-600 font-medium">{sample.location}</p>
                                    <p className="text-xs text-slate-500">{sample.description}</p>
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
