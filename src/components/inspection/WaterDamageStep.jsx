
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, Upload, X, Droplets, PlusCircle } from "lucide-react";
import { UploadInspectionImage } from "@/api/integrations";
import { motion, AnimatePresence } from "framer-motion";

function WaterDamageRow({ index, details, updateLocation, removeLocation }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    const input = event.target; // Store the input element reference
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
    // Reset the input value so the same file can be selected again if needed
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
        placeholder="Describe location and type of damage (e.g., kitchen pipe leak under sink)"
        className="min-h-24 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
      />
      
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          id={`water-damage-upload-${index}`}
          disabled={isUploading}
        />
        <label htmlFor={`water-damage-upload-${index}`} className="cursor-pointer">
          <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 font-medium text-sm">
            {isUploading ? "Uploading..." : "Upload Photos"}
          </p>
        </label>
      </div>

      {details.images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
          {details.images.map((imageUrl, imageIndex) => (
            <div key={imageIndex} className="relative group">
              <img
                src={imageUrl}
                alt={`Water damage evidence ${imageIndex + 1}`}
                className="w-full h-16 sm:h-20 object-cover rounded-lg border border-slate-200"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeImage(imageIndex)}
                className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function WaterDamageStep({ formData, updateFormData, onNext, onPrev }) {
  const handleWaterDamageChange = (hasWaterDamage) => {
    if (hasWaterDamage) {
      // If user selects "Yes, recent water issues", initialize with one empty location
      const newDetails = formData.water_damage_details.length > 0
        ? formData.water_damage_details
        : [{ location: "", images: [] }];
      updateFormData({ 
        has_water_damage: true, 
        water_damage_details: newDetails 
      });
    } else {
      // If user selects "No recent water damage", clear the details
      updateFormData({ 
        has_water_damage: false, 
        water_damage_details: [] 
      });
    }
  };

  // Function to handle next with scroll to top
  const handleNext = () => {
    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Call the original onNext function
    onNext();
  };

  const updateLocation = (index, field, value) => {
    const newDetails = [...formData.water_damage_details];
    newDetails[index][field] = value;
    updateFormData({ water_damage_details: newDetails });
  };

  const addLocation = () => {
    updateFormData({
      water_damage_details: [...formData.water_damage_details, { location: "", images: [] }]
    });
  };

  const removeLocation = (index) => {
    const newDetails = formData.water_damage_details.filter((_, i) => i !== index);
    updateFormData({ water_damage_details: newDetails });
  };

  const canProceed = !formData.has_water_damage || 
    (formData.has_water_damage && formData.water_damage_details.every(d => d.location.trim()));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-slate-700 font-medium text-base">
          Have you had any water damage or leaks recently? *
        </Label>
        <p className="text-sm text-slate-600">
          This includes flooding, roof leaks, pipe bursts, or any moisture issues in the past 6 months.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 px-2 sm:px-0">
          <Button
            type="button"
            variant={formData.has_water_damage === true ? "default" : "outline"}
            onClick={() => handleWaterDamageChange(true)}
            className={`h-14 sm:h-16 rounded-xl font-medium text-sm sm:text-base ${
              formData.has_water_damage === true 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'border-slate-200 hover:bg-blue-50 hover:border-blue-200'
            }`}
          >
            <Droplets className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Yes, recent water issues
          </Button>
          
          <Button
            type="button"
            variant={formData.has_water_damage === false ? "default" : "outline"}
            onClick={() => handleWaterDamageChange(false)}
            className={`h-14 sm:h-16 rounded-xl font-medium text-sm sm:text-base ${
              formData.has_water_damage === false 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'border-slate-200 hover:bg-green-50 hover:border-green-200'
            }`}
          >
            No recent water damage
          </Button>
        </div>
      </div>

      {formData.has_water_damage && (
        <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
          <Label className="text-slate-700 font-medium">
            Where did the water damage occur? *
          </Label>
          <div className="space-y-4">
            <AnimatePresence>
              {formData.water_damage_details.map((details, index) => (
                <WaterDamageRow
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

      <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
        <h3 className="font-semibold text-amber-900 mb-2">Why This Matters</h3>
        <p className="text-amber-700 text-sm">
          Water damage creates ideal conditions for mold growth. Even if the area appears dry now, 
          mold can develop within 24-48 hours after water exposure and may be hidden behind walls 
          or under flooring.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4">
        <Button
          onClick={onPrev}
          variant="outline"
          className="px-6 sm:px-8 py-3 rounded-xl font-medium border-slate-200 hover:bg-slate-50 w-full sm:w-auto order-2 sm:order-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!canProceed}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 rounded-xl font-medium w-full sm:w-auto order-1 sm:order-2"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
