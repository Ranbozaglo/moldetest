import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, ArrowLeft, FlaskConical, Beaker, MapPin, Paintbrush, Archive, Repeat, CheckCircle, Plus, X, Camera, Upload, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadInspectionImage } from '@/api/integrations';

// SampleRow component moved outside to prevent re-creation
const SampleRow = React.memo(({ index, sample, updateSample, removeSample }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    const input = event.target;
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await UploadInspectionImage(file);
      updateSample(index, "sample_image", result.file_url);
    } catch (error) {
      console.error("Error uploading sample image:", error);
      alert("Image upload failed. Please check your internet connection and try again.");
    }
    setIsUploading(false);
    if (input) input.value = "";
  }, [index, updateSample]);

  const removeImage = useCallback(() => {
    updateSample(index, "sample_image", "");
  }, [index, updateSample]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-blue-500" />
          Sample #{index + 1}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeSample(index)}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            placeholder="Location (e.g., Living Room Wall)"
            value={sample.location}
            onChange={(e) => updateSample(index, "location", e.target.value)}
            className="h-12 rounded-xl border-slate-200"
          />
          <Textarea
            placeholder="Description (e.g., Surface swab from black spot near window)"
            value={sample.description}
            onChange={(e) => updateSample(index, "description", e.target.value)}
            className="rounded-xl border-slate-200 min-h-[48px]"
          />
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-slate-700 flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Sample Collection Photo
          </h4>
          
          {!sample.sample_image ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id={`sample-upload-${index}`}
                disabled={isUploading}
              />
              <label htmlFor={`sample-upload-${index}`} className="cursor-pointer">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 font-medium">
                  {isUploading ? "Uploading..." : "Upload Sample Photo"}
                </p>
                <p className="text-sm text-slate-500">
                  Show the collection process or sample location
                </p>
              </label>
            </div>
          ) : (
            <div className="relative group max-w-32">
              <img
                src={sample.sample_image}
                alt={`Sample ${index + 1} collection`}
                className="w-full h-20 object-cover rounded-lg border border-slate-200"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={removeImage}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

SampleRow.displayName = 'SampleRow';

export default function SamplingGuideStep({ formData, updateFormData, onNext, onPrev }) {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [samples, setSamples] = useState([
    { location: "", description: "", sample_image: "" },
    { location: "", description: "", sample_image: "" }
  ]);

  // Sync samples with formData when component mounts
  useEffect(() => {
    if (formData.samples) {
      setSamples(formData.samples);
    }
  }, [formData.samples]);
  const [sampleImages] = useState([
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
  ]);

  const [imageErrors, setImageErrors] = useState({});
  const [logoErrors, setLogoErrors] = useState({});

  // Sample management functions
  const updateSample = useCallback((index, field, value) => {
    setSamples(prevSamples => {
      const newSamples = [...prevSamples];
      newSamples[index] = { ...newSamples[index], [field]: value };
      return newSamples;
    });
  }, []);

  const addSample = useCallback(() => {
    setSamples(prevSamples => [...prevSamples, { location: "", description: "", sample_image: "" }]);
  }, []);

  const removeSample = useCallback((index) => {
    setSamples(prevSamples => prevSamples.filter((_, i) => i !== index));
  }, []);

  const handleNext = () => {
    // Update formData with samples before proceeding to next step
    updateFormData({ samples: samples });
    onNext();
  };

  const handleImageError = (imageUrl, type = 'sample') => {
    console.log(`🔍 DEBUG: Image error for ${type}:`, imageUrl);
    if (type === 'sample') {
      setImageErrors(prev => ({ ...prev, [imageUrl]: true }));
    } else if (type === 'logo') {
      setLogoErrors(prev => ({ ...prev, [imageUrl]: true }));
    }
  };

  const   LogoImage = ({ size = "w-8 h-8", logoId = "default" }) => {
    const logoSrc = "https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/mold.images/uploads/logos.png";
    const hasError = logoErrors[logoSrc];
    
    if (hasError) {
      return (
        <div className={`${size} bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm`}>
          TT
        </div>
      );
    }
    
    return (
      <img
        src={logoSrc}
        alt="Total Testing Logo"
        className={size}
        onError={() => handleImageError(logoSrc, 'logo')}
        style={{ backgroundColor: 'transparent' }}
      />
    );
  };

  // Show disclaimer first
  if (!disclaimerAccepted) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
              <LogoImage size="w-8 h-8" logoId="disclaimer-main" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Important Disclaimer</h1>
            <p className="text-lg text-slate-600">
              Please read and acknowledge the following before proceeding.
            </p>
          </div>

          <div className="glass-effect  p-8 rounded-2xl mb-8 border-2 border-amber-200">
            <div className="flex items-start gap-3 mb-6">
              <LogoImage size="w-6 h-6" logoId="disclaimer-small" />
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

  const hasVisibleMold = formData && formData.has_visible_mold && formData.visible_mold_details && formData.visible_mold_details.length > 0;

  return (
    <div className="space-y-6">
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
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Sample Documentation</h2>
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Documentation Requirements
              </h3>
              <div className="space-y-4 text-blue-800">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Location Details:</strong> Record the specific room, area, and surface where each sample was collected (e.g., "Master Bathroom - Ceiling behind toilet", "Kitchen - Under sink cabinet")</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Visual Description:</strong> Note the appearance of the mold growth (color, texture, size of affected area)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Environmental Conditions:</strong> Document any moisture sources, water damage, or humidity issues in the area</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Collection Time:</strong> Note the date and time of sample collection for tracking purposes</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Sample Labeling Best Practices
              </h3>
              <div className="space-y-3 text-amber-800">
                <p><strong>Clear Labeling:</strong> Use permanent marker to label each Ziploc bag before collection</p>
                <p><strong>Unique Identifiers:</strong> Include room name, surface type, and sample number (e.g., "Bathroom-Ceiling-01")</p>
                <p><strong>Date & Time:</strong> Add collection date and time to each sample label</p>
                <p><strong>Visual Reference:</strong> Consider taking photos of sampling areas for future reference</p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Quality Control Checklist
              </h3>
              <div className="space-y-2 text-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Each sample has a unique, clearly written label</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Q-tip is properly coated with visible mold material</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Ziploc bag is completely sealed and airtight</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Documentation includes location and environmental details</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>All samples are stored in a clean, dry location</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-effect p-8 rounded-2xl mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Sample Collection Examples</h2>
          <p className="text-slate-600 mb-6">
            Here are examples of proper sample collection technique from previous inspections. Notice the use of disposable gloves and proper sampling positioning.
          </p>
          
          {sampleImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sampleImages.map((sample, idx) => (
                <div key={sample.sample_image} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="relative">
                    {imageErrors[sample.sample_image] ? (
                      <div className="w-full h-64 bg-slate-100 flex items-center justify-center">
                        <div className="text-center">
                          <Beaker className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                          <p className="text-slate-500 text-sm">Image unavailable</p>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={sample.sample_image}
                        alt={sample.name}
                        className="w-full h-64 object-cover"
                        onError={() => handleImageError(sample.sample_image)}
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-slate-800 text-lg mb-2">{sample.name}</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">{sample.description}</p>
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

        {/* Sample Collection Form */}
        <div className="glass-effect p-8 rounded-2xl mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Sample Collection Form</h2>
          <p className="text-slate-600 mb-6">
            Document your sample collection details below. Add as many samples as needed for each location where you collected swab samples.
          </p>
          
          <div className="space-y-6">
            {samples.map((sample, index) => (
              <SampleRow
                key={`sample-${index}`}
                index={index}
                sample={sample}
                updateSample={updateSample}
                removeSample={removeSample}
              />
            ))}
          </div>
          
          <div className="mt-6">
            <Button
              type="button"
              onClick={addSample}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Another Sample
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between pt-6">
          <Button
            onClick={onPrev}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            className="flex items-center gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
} 