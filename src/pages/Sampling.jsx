
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Plus, X, Info, Upload, Trash2 } from "lucide-react";
import { Sample } from "@/api/entities";
import { MoldInspection } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";
import { UploadFile } from "@/api/integrations";
import { FlaskConical, Camera } from "lucide-react";
import { getDisplayNumber, validateInspection } from "@/utils/inspectionUtils";

function SampleRow({ index, sample, updateSample, removeSample }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    const input = event.target;
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await UploadFile({ file });
      updateSample(index, "sample_image", result.file_url);
    } catch (error) {
      console.error("Error uploading sample image:", error);
      alert("Image upload failed. Please check your internet connection and try again.");
    }
    setIsUploading(false);
    if (input) input.value = "";
  };

  const removeImage = () => {
    updateSample(index, "sample_image", "");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white p-6 rounded-2xl border border-slate-200"
    >
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
    </motion.div>
  );
}

export default function Sampling() {
  const location = useLocation();
  const navigate = useNavigate();
  const [inspectionId, setInspectionId] = useState(null);
  const [inspectionData, setInspectionData] = useState(null);
  const [samples, setSamples] = useState([
    { location: "", description: "", sample_image: "" },
    { location: "", description: "", sample_image: "" }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false); // New state to prevent race condition
  const [showTips, setShowTips] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // This guard prevents the effect from running again while we are navigating away after a successful submission.
    if (isCompleting) return;

    const params = new URLSearchParams(location.search);
    const id = params.get("inspectionId");
    
    if (id) {
      setInspectionId(id);
      loadInspectionData(id);
    } else {
      console.error("No inspection ID found in URL parameters");
      alert("No inspection ID found. Please start a new inspection.");
      navigate(createPageUrl("Welcome"));
    }
  }, [location.search, navigate, isCompleting]);

  const loadInspectionData = async (id) => {
    try {
      const inspectionData = await MoldInspection.findUnique({ id });
      
      if (inspectionData) {
        // Validate the inspection data
        const validation = validateInspection(inspectionData);
        if (!validation.isValid) {
          console.error("🔍 DEBUG: Inspection validation failed:", validation.errors);
          alert("Invalid inspection data. Please start a new inspection.");
          navigate(createPageUrl("Welcome"));
          return;
        }
        
        console.log("🔍 DEBUG: Inspection display number:", getDisplayNumber(inspectionData));
        setInspectionData(inspectionData);
        
        // Pre-populate samples if they exist for this inspection
        if (inspectionData.samples && inspectionData.samples.length > 0) {
          setSamples(inspectionData.samples.map(s => ({
            location: s.location || "",
            description: s.description || "",
            sample_image: s.sample_image || ""
          })));
        }
        // If inspection is already completed, prevent re-submission and redirect
        if (inspectionData.status === "completed") {
          alert("This inspection has already been completed. Redirecting to your inspections.");
          // Redirect admin users to AdminDashboard, regular users to MyInspections
          const redirectPage = (user && (user.role === 'admin' || user.is_admin)) ? "AdminDashboard" : "MyInspections";
          navigate(createPageUrl(redirectPage));
          return; // Exit early as we're redirecting
        }
      } else {
        console.error("Inspection not found with ID:", id);
        alert("Inspection data not found. Please start a new inspection.");
        navigate(createPageUrl("Welcome"));
      }
    } catch (error) {
      console.error("Error loading inspection data:", error);
      alert("Failed to load inspection data. Please refresh the page or start a new inspection.");
      navigate(createPageUrl("Welcome"));
    }
  };

  const updateSample = (index, field, value) => {
    const newSamples = [...samples];
    newSamples[index][field] = value;
    setSamples(newSamples);
  };

  const addSample = () => {
    setSamples([...samples, { location: "", description: "", sample_image: "" }]);
  };

  const removeSample = (index) => {
    setSamples(samples.filter((_, i) => i !== index));
  };

  const handleSaveSamples = async () => {
    if (!inspectionId) {
      alert("No inspection ID available. Please start a new inspection.");
      navigate(createPageUrl("Welcome"));
      return;
    }

    setIsSaving(true);
    setIsCompleting(true);
    
    try {
      const samplesToSave = samples
        .filter(s => s.location.trim() !== "")
        .map(s => ({ 
          location: s.location.trim(),
          description: s.description.trim(),
          sample_image: s.sample_image || "",
          inspection_id: inspectionId
        }));

      if (samplesToSave.length > 0) {
        await Sample.bulkCreate(samplesToSave);
      }
      
      // Update the client status detail, but keep the inspection status as 'pending'
      await MoldInspection.update(inspectionId, { 
        client_status_detail: "Samples documented - awaiting shipment to lab"
      });
      
      alert("Submitted successfully!");
      
      // Redirect admin users to AdminDashboard, regular users to MyInspections
      const redirectPage = (user && (user.role === 'admin' || user.is_admin)) ? "AdminDashboard" : "MyInspections";
      navigate(createPageUrl(redirectPage));
      
    } catch (error) {
      console.error("Error during final submission:", error);
      alert("An error occurred while completing the inspection. Please check your internet connection and try again.");
      setIsCompleting(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Don't render the form until we have the inspection ID - but don't show error if we're redirecting
  if (!inspectionId && !isCompleting) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-6">
        <div className="text-lg text-slate-600">Loading inspection data...</div>
        <div className="text-sm text-slate-400 mt-2">
          If this takes too long, please <Link to={createPageUrl("Welcome")} className="text-blue-600 hover:underline">start a new inspection</Link>.
        </div>
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
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Sample Documentation</h1>
          <p className="text-lg text-slate-600">
            Complete your inspection by documenting the samples you've collected.
          </p>
        </div>

        {showTips && (
          <Alert className="mb-8 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold mb-2">Sample Collection Photography Tips:</h3>
                  <ul className="text-sm space-y-1">
                    <li>• Take photos during the collection process to show proper technique</li>
                    <li>• Include close-up shots of the exact sampling location</li>
                    <li>• Ensure good lighting - use phone flashlight if needed</li>
                    <li>• Show the sampling tool (swab, tape lift, etc.) in contact with the surface</li>
                    <li>• Capture any visible contamination or discoloration being sampled</li>
                  </ul>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTips(false)}
                  className="text-blue-600 hover:bg-blue-100 ml-4"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="glass-effect p-8 rounded-2xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Document Sample Locations</h2>
          <div className="space-y-6 mb-6">
            <AnimatePresence>
              {samples.map((sample, index) => (
                <SampleRow
                  key={index}
                  index={index}
                  sample={sample}
                  updateSample={updateSample}
                  removeSample={removeSample}
                />
              ))}
            </AnimatePresence>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={addSample}
              className="w-full sm:w-auto border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-medium py-3 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Sample
            </Button>
            
            <Button
              onClick={handleSaveSamples}
              disabled={isSaving || !inspectionId}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-medium px-8 py-3 rounded-xl"
            >
              {isSaving ? "Saving..." : "Complete Inspection"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
