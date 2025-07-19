import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" }
];

export default function PersonalInfoStep({ formData, updateFormData, onNext, user }) {
  const handleInputChange = (field, value) => {
    updateFormData({ [field]: value });
  };

  const canProceed =
    formData.full_name.trim() &&
    formData.email.trim() &&
    formData.client_type &&
    formData.property_type &&
    formData.street_address.trim() &&
    formData.city.trim() &&
    formData.state.trim() &&
    formData.zip_code.trim();

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="full_name" className="text-slate-700 font-medium">
            Full Name *
          </Label>
          <Input
            id="full_name"
            type="text"
            value={formData.full_name}
            onChange={(e) => handleInputChange("full_name", e.target.value)}
            placeholder="Enter your full name"
            className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-700 font-medium">
            Email Address *
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            placeholder="Your email address"
            className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            disabled={!!user}
          />
           {user && <p className="text-xs text-slate-500 mt-1">Email is locked to your logged-in account.</p>}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label className="text-slate-700 font-medium">
          Are you the homeowner or a tenant? *
        </Label>
        <RadioGroup
          value={formData.client_type}
          onValueChange={(value) => handleInputChange("client_type", value)}
          className="flex gap-4 pt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="homeowner" id="homeowner" />
            <Label htmlFor="homeowner">Homeowner</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="tenant" id="tenant" />
            <Label htmlFor="tenant">Tenant</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-700 font-medium">
          What type of property is this? *
        </Label>
        <RadioGroup
          value={formData.property_type}
          onValueChange={(value) => handleInputChange("property_type", value)}
          className="grid md:grid-cols-2 gap-3 pt-2"
        >
          <div className="space-y-3">
            <Label className="text-sm font-medium text-blue-700">Residential:</Label>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="house" id="house" />
              <Label htmlFor="house">House</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="apartment" id="apartment" />
              <Label htmlFor="apartment">Apartment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="townhome" id="townhome" />
              <Label htmlFor="townhome">Townhome</Label>
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium text-green-700">Commercial:</Label>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="office_space" id="office_space" />
              <Label htmlFor="office_space">Office Space</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="retail_store" id="retail_store" />
              <Label htmlFor="retail_store">Retail Store</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="commercial_other" id="commercial_other" />
              <Label htmlFor="commercial_other">Other Commercial</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      <hr className="my-6 border-slate-200" />

      <h3 className="text-lg font-semibold text-slate-800">Property Address</h3>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="street_address" className="text-slate-700 font-medium">
            Street Address *
          </Label>
          <Input
            id="street_address"
            type="text"
            value={formData.street_address}
            onChange={(e) => handleInputChange("street_address", e.target.value)}
            placeholder="Enter property street address"
            className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit_number" className="text-slate-700 font-medium">
            Apt, suite, unit, etc. (Optional)
          </Label>
          <Input
            id="unit_number"
            type="text"
            value={formData.unit_number}
            onChange={(e) => handleInputChange("unit_number", e.target.value)}
            placeholder="e.g. Apt 123"
            className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city" className="text-slate-700 font-medium">
            City *
          </Label>
          <Input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => handleInputChange("city", e.target.value)}
            placeholder="e.g. Houston"
            className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state" className="text-slate-700 font-medium">
            State *
          </Label>
          <Select
            value={formData.state}
            onValueChange={(value) => handleInputChange("state", value)}
          >
            <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip_code" className="text-slate-700 font-medium">
            Zip Code *
          </Label>
          <Input
            id="zip_code"
            type="text"
            value={formData.zip_code}
            onChange={(e) => handleInputChange("zip_code", e.target.value)}
            placeholder="e.g. 77001"
            className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-2">Why We Need This Information</h3>
        <p className="text-blue-700 text-sm">
          Your personal and property information helps us provide accurate assessment results and 
          ensures we can deliver your detailed mold inspection report to the correct person and location.
        </p>
      </div>

      <div className="flex justify-end pt-4">
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