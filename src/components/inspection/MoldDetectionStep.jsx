
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, Upload, X, AlertTriangle, PlusCircle } from "lucide-react";
import { UploadInspectionImage } from "@/api/integrations";
import { motion, AnimatePresence } from "framer-motion";

function MoldLocationRow({ index, details, updateLocation, removeLocation }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    const input = event.target;
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = files.map(file => UploadInspectionImage(file));
      const results = await Promise.all(uploadPromises);
      const newImageUrls = results.map(result => result.file_url);
      const updatedImages = [...details.images, ...newImageUrls];
      updateLocation(index, "images", updatedImages);
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Image upload failed. Please check your internet connection and try again.");
    }
    setIsUploading(false);
    if(input) input.value = "";
  };

  const removeImage = (imageIndex) => {
    const updatedImages = details.images.filter((_, i) => i !== imageIndex);
    updateLocation(index, "images", updatedImages);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4"
    >
      <div className="flex justify-between items-center">
        <Label className="text-slate-700 font-medium">Location #{index + 1}</Label>
        {index > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeLocation(index)}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      <Textarea
        value={details.location}
        onChange={(e) => updateLocation(index, "location", e.target.value)}
        placeholder="e.g., Bathroom ceiling, basement walls, around windows"
        className="min-h-24 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
      />
      
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          id={`mold-upload-${index}`}
          disabled={isUploading}
        />
        <label htmlFor={`mold-upload-${index}`} className="cursor-pointer">
          <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 font-medium text-sm">
            {isUploading ? "Uploading..." : "Upload Photos"}
          </p>
        </label>
      </div>

      {details.images.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {details.images.map((imageUrl, imageIndex) => (
            <div key={imageIndex} className="relative group">
              <img
                src={imageUrl}
                alt={`Mold evidence ${imageIndex + 1}`}
                className="w-full h-20 object-cover rounded-lg border border-slate-200"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeImage(imageIndex)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function MoldDetectionStep({ formData, updateFormData, onNext, onPrev }) {
  const handleVisibleMoldChange = (hasVisible) => {
    updateFormData({ 
      has_visible_mold: hasVisible,
      visible_mold_details: hasVisible ? formData.visible_mold_details : []
    });
  };

  const updateLocation = (index, field, value) => {
    const newDetails = [...formData.visible_mold_details];
    newDetails[index][field] = value;
    updateFormData({ visible_mold_details: newDetails });
  };

  const addLocation = () => {
    updateFormData({
      visible_mold_details: [...formData.visible_mold_details, { location: "", images: [] }]
    });
  };

  const removeLocation = (index) => {
    const newDetails = formData.visible_mold_details.filter((_, i) => i !== index);
    updateFormData({ visible_mold_details: newDetails });
  };

  const canProceed = !formData.has_visible_mold || 
    (formData.has_visible_mold && formData.visible_mold_details.every(d => d.location.trim()));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-slate-700 font-medium text-base">
          Do you see any visible mold in your property? *
        </Label>
        
        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant={formData.has_visible_mold === true ? "default" : "outline"}
            onClick={() => handleVisibleMoldChange(true)}
            className={`h-16 rounded-xl font-medium ${
              formData.has_visible_mold === true 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'border-slate-200 hover:bg-red-50 hover:border-red-200'
            }`}
          >
            <AlertTriangle className="w-5 h-5 mr-2" />
            Yes, I see mold
          </Button>
          
          <Button
            type="button"
            variant={formData.has_visible_mold === false ? "default" : "outline"}
            onClick={() => handleVisibleMoldChange(false)}
            className={`h-16 rounded-xl font-medium ${
              formData.has_visible_mold === false 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'border-slate-200 hover:bg-green-50 hover:border-green-200'
            }`}
          >
            No visible mold
          </Button>
        </div>
      </div>

      {formData.has_visible_mold && (
        <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
          <Label htmlFor="mold_locations" className="text-slate-700 font-medium">
            Where do you see the mold? *
          </Label>
          <div className="space-y-4">
            <AnimatePresence>
              {formData.visible_mold_details.map((details, index) => (
                <MoldLocationRow
                  key={index}
                  index={index}
                  details={details}
                  updateLocation={updateLocation}
                  removeLocation={removeLocation}
                />
              ))}
            </AnimatePresence>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addLocation}
            className="w-full border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-medium py-3 rounded-xl"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Another Location
          </Button>
        </div>
      )}

      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-2">What We're Looking For</h3>
        <p className="text-blue-700 text-sm">
          Visible mold can appear as black, green, white, or brown spots or patches. 
          It may have a fuzzy, slimy, or powdery texture. Common locations include 
          bathrooms, basements, around windows, and areas with water damage.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button
          onClick={onPrev}
          variant="outline"
          className="px-8 py-3 rounded-xl font-medium border-slate-200 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
