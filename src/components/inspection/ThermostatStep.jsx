import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Upload, X, Thermometer, Droplets } from "lucide-react";
import { UploadInspectionImage } from "@/api/integrations";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function ThermostatStep({ formData, updateFormData, onNext, onPrev }) {
  const [isUploading, setIsUploading] = useState(false);

  // Set default to manual if no method is set
  const currentMethod = formData.environmental_data_method || "manual";

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    const input = event.target;
    if (!file) return;

    setIsUploading(true);
    
    try {
      const result = await UploadInspectionImage(file);
      updateFormData({ 
        thermostat_image: result.file_url,
        environmental_data_method: "photo"
      });
    } catch (error) {
      console.error("Error uploading thermostat image:", error);
      alert("Image upload failed. Please check your internet connection and try again.");
    }
    
    setIsUploading(false);
    if (input) input.value = "";
  };

  const removeImage = () => {
    updateFormData({ 
      thermostat_image: "",
      environmental_data_method: formData.temperature || formData.humidity ? "manual" : "manual"
    });
  };

  const handleMethodChange = (method) => {
    if (method === "photo") {
      updateFormData({ 
        environmental_data_method: method,
        temperature: "",
        humidity: ""
      });
    } else if (method === "manual") {
      updateFormData({ 
        environmental_data_method: method,
        thermostat_image: ""
      });
    } else if (method === "none") {
      updateFormData({ 
        environmental_data_method: method,
        thermostat_image: "",
        temperature: "",
        humidity: ""
      });
    }
  };

  const handleInputChange = (field, value) => {
    const numValue = value === "" ? "" : parseFloat(value);
    updateFormData({ [field]: numValue });
    
    // Keep method as manual when entering values
    if ((field === "temperature" || field === "humidity") && currentMethod !== "photo") {
      updateFormData({ environmental_data_method: "manual" });
    }
  };

  const canProceed = 
    currentMethod === "photo" && formData.thermostat_image ||
    currentMethod === "manual" && formData.temperature && formData.humidity ||
    currentMethod === "none";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-slate-700 font-medium text-base">
          Environmental Conditions *
        </Label>
        <p className="text-slate-600">
          Please provide temperature and humidity information to help us assess conditions that may contribute to mold growth.
        </p>
      </div>

      <div className="space-y-6">
        <RadioGroup
          value={currentMethod}
          onValueChange={handleMethodChange}
          className="space-y-4"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="manual" id="manual" />
            <Label htmlFor="manual" className="font-medium">Enter temperature and humidity manually</Label>
          </div>
          
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="photo" id="photo" />
            <Label htmlFor="photo" className="font-medium">Upload thermostat photo</Label>
          </div>
          
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="none" id="none" />
            <Label htmlFor="none" className="font-medium">I don't have access to this information</Label>
          </div>
        </RadioGroup>

        {currentMethod === "manual" && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature" className="text-slate-700 font-medium flex items-center gap-2">
                  <Thermometer className="w-4 h-4" />
                  Temperature (°F) *
                </Label>
                <Input
                  id="temperature"
                  type="number"
                  min="32"
                  max="120"
                  value={formData.temperature || ""}
                  onChange={(e) => handleInputChange("temperature", e.target.value)}
                  placeholder="e.g., 72"
                  className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="humidity" className="text-slate-700 font-medium flex items-center gap-2">
                  <Droplets className="w-4 h-4" />
                  Humidity (%) *
                </Label>
                <Input
                  id="humidity"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.humidity || ""}
                  onChange={(e) => handleInputChange("humidity", e.target.value)}
                  placeholder="e.g., 45"
                  className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {currentMethod === "photo" && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
            {!formData.thermostat_image ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="thermostat-upload"
                  disabled={isUploading}
                />
                <label htmlFor="thermostat-upload" className="cursor-pointer">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Thermometer className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-slate-600 font-medium text-lg mb-2">
                    {isUploading ? "Uploading..." : "Take a Photo of Your Thermostat"}
                  </p>
                  <p className="text-sm text-slate-500">
                    Make sure the temperature and humidity readings are clearly visible
                  </p>
                </label>
              </div>
            ) : (
              <div className="relative group max-w-md mx-auto">
                <img
                  src={formData.thermostat_image}
                  alt="Thermostat reading"
                  className="w-full h-64 object-cover rounded-xl border border-slate-200"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {currentMethod === "none" && (
          <div className="bg-amber-50 rounded-xl p-6 border border-amber-100 animate-in slide-in-from-top-2 duration-300">
            <h3 className="font-semibold text-amber-900 mb-2">No Problem!</h3>
            <p className="text-amber-700 text-sm">
              We understand that not everyone has access to temperature and humidity readings. 
              We'll proceed with the other information you've provided for your inspection.
            </p>
          </div>
        )}
      </div>

      {currentMethod === "photo" && (
        <div className="bg-green-50 rounded-xl p-6 border border-green-100">
          <h3 className="font-semibold text-green-900 mb-2">Photography Tips</h3>
          <ul className="text-green-700 text-sm space-y-1">
            <li>• Ensure the display is clearly readable</li>
            <li>• Take the photo during the day for better lighting</li>
            <li>• Get close enough to see temperature and humidity numbers</li>
            <li>• Make sure the image isn't blurry or too dark</li>
          </ul>
        </div>
      )}

      {(currentMethod === "photo" || currentMethod === "manual") && (
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
          <h3 className="font-semibold text-amber-900 mb-2">Why We Need This</h3>
          <p className="text-amber-700 text-sm">
            Temperature and humidity levels are critical factors in mold growth. 
            High humidity (above 60%) combined with warm temperatures creates ideal 
            conditions for mold development, even without visible moisture.
          </p>
        </div>
      )}

      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-2">What Happens Next?</h3>
        <p className="text-blue-700 text-sm">
          After continuing, you'll be shown a guide on how to properly collect samples.
          You will then document the collected samples and ship it to our lab.
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