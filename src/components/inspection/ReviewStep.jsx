
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


export default function ReviewStep({ 
  formData, 
  onPrev, 
  onSubmit, 
  isSubmitting 
}) {
  
  // Function to handle submit with scroll to top
  const handleSubmit = () => {
    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Call the original onSubmit function
    onSubmit();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          Review Your Information
        </h3>
        <p className="text-slate-600">
          Please review all the information below before continuing to sample documentation.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <Card className="border border-slate-200 rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Full Name:</span>
              <span className="font-medium">{formData.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Email:</span>
              <span className="font-medium">{formData.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Client Type:</span>
              <span className="font-medium capitalize">{formData.client_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Property Type:</span>
              <span className="font-medium capitalize">
                {formData.property_type === 'office_space' ? 'Office Space' :
                 formData.property_type === 'retail_store' ? 'Retail Store' :
                 formData.property_type === 'commercial_other' ? 'Other Commercial' :
                 formData.property_type}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-600">Property Address:</span>
              <div className="font-medium text-right">
                <div>{formData.street_address}{formData.unit_number && `, ${formData.unit_number}`}</div>
                <div>{formData.city}, {formData.state} {formData.zip_code}</div>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Square Footage:</span>
              <span className="font-medium">{formData.square_footage} sq ft</span>
            </div>
            {formData.background_info && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-600 block mb-2">Background Information:</span>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                  {formData.background_info}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mold Detection */}
        <Card className="border border-slate-200 rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Mold Detection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Visible Mold Present:</span>
              <Badge variant={formData.has_visible_mold ? "destructive" : "secondary"}>
                {formData.has_visible_mold ? "Yes" : "No"}
              </Badge>
            </div>
            {formData.has_visible_mold && formData.visible_mold_details.map((detail, index) => (
              <div key={index} className="bg-slate-50 p-3 rounded-lg border">
                <p className="font-medium text-slate-700">Location #{index + 1}</p>
                <p className="text-sm text-slate-600 mt-1 mb-2">{detail.location}</p>
                {detail.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {detail.images.map((image, imgIndex) => (
                      <img
                        key={imgIndex}
                        src={image}
                        alt={`Mold evidence ${index + 1}-${imgIndex + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Water Damage */}
        <Card className="border border-slate-200 rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Water Damage Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Recent Water Damage:</span>
              <Badge variant={formData.has_water_damage ? "default" : "secondary"}>
                {formData.has_water_damage ? "Yes" : "No"}
              </Badge>
            </div>
            {formData.has_water_damage && formData.water_damage_details.map((detail, index) => (
              <div key={index} className="bg-slate-50 p-3 rounded-lg border">
                <p className="font-medium text-slate-700">Location #{index + 1}</p>
                <p className="text-sm text-slate-600 mt-1 mb-2">{detail.location}</p>
                {detail.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {detail.images.map((image, imgIndex) => (
                      <img
                        key={imgIndex}
                        src={image}
                        alt={`Water damage evidence ${index + 1}-${imgIndex + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Environmental Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Data Method:</span>
              <span className="font-medium capitalize">
                {formData.environmental_data_method === "photo" && "Thermostat Photo"}
                {formData.environmental_data_method === "manual" && "Manual Entry"}
                {formData.environmental_data_method === "none" && "Not Available"}
              </span>
            </div>
            
            {formData.environmental_data_method === "photo" && formData.thermostat_image && (
              <div>
                <span className="text-slate-600 block mb-2">Thermostat Reading:</span>
                <img
                  src={formData.thermostat_image}
                  alt="Thermostat reading"
                  className="w-32 h-24 object-cover rounded border"
                />
              </div>
            )}
            
            {formData.environmental_data_method === "manual" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">Temperature:</span>
                  <span className="font-medium">{formData.temperature}°F</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Humidity:</span>
                  <span className="font-medium">{formData.humidity}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      <Card className="border border-slate-200 rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Samples Collected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Samples:</span>
              <span className="font-medium capitalize">
                {formData.samples.length} samples
              </span>
            </div>
            {formData.samples.map((sample, index) => (
              <div key={index} className="flex justify-between">
                <div>
                <p className="font-medium text-slate-700">Sample #{index + 1}</p>
                <p className="text-sm text-slate-600 mt-1 mb-2">{sample.location}</p>
                </div>
                <div>
              <img
                src={sample.sample_image}
                alt={`Sample ${index + 1}`} 
                className="w-32 h-24 object-cover rounded border"
              />  
              </div>
              </div>
            ))}
          </CardContent>

        </Card>
      

    

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
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-medium"
        >
          {isSubmitting ? (
            "Processing..."
          ) : (
            <>
              complete inspection
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
