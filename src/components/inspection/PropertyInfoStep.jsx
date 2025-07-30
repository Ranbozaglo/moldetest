import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";

export default function PropertyInfoStep({ formData, updateFormData, onNext, onPrev }) {
  const handleInputChange = (field, value) => {
    updateFormData({ [field]: value });
  };

  // Function to handle next with scroll to top
  const handleNext = () => {
    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Call the original onNext function
    onNext();
  };

  const canProceed = formData.square_footage && parseFloat(formData.square_footage) > 0;

  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <Label htmlFor="square_footage" className="text-slate-700 font-medium">
          Property Square Footage *
        </Label>
        <div className="mt-2">
          <Input
            id="square_footage"
            type="number"
            min="1"
            value={formData.square_footage}
            onChange={(e) => handleInputChange("square_footage", e.target.value)}
            placeholder="e.g., 1500"
            className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="text-sm text-slate-500 mt-2">
            Enter the approximate square footage of your property
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="background_info" className="text-slate-700 font-medium">
          Background Information (Optional)
        </Label>
        <Textarea
          id="background_info"
          value={formData.background_info}
          onChange={(e) => handleInputChange("background_info", e.target.value)}
          placeholder="Please provide any additional details about your property, concerns, or relevant history that might help us understand your situation better. For example: previous water damage, health symptoms, specific areas of concern, etc."
          className="min-h-32 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="text-sm text-slate-500">
          Note: The more information you provide, the better we can understand your situation and provide accurate recommendations.
        </p>
      </div>

      <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
        <h3 className="font-semibold text-amber-900 mb-2">Square Footage Guidelines</h3>
        <ul className="text-amber-700 text-sm space-y-1">
          <li>• Include all livable spaces (bedrooms, living areas, kitchen, etc.)</li>
          <li>• Don't include garages, attics, or unfinished basements</li>
          <li>• Approximate measurements are acceptable</li>
          <li>• This helps us determine testing scope and recommendations</li>
        </ul>
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
          onClick={handleNext}
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