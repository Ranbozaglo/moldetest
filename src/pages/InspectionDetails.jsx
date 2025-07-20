import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MoldInspection } from "@/api/entities";
import { Sample } from "@/api/entities";
import { User } from "@/api/entities";
import { UploadFile, InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { getUrlParam } from "@/utils/urlUtils";
import { 
  ArrowLeft, 
  Upload, 
  Save, 
  FileText, 
  Calendar, 
  MapPin, 
  User as UserIcon,
  FlaskConical,
  Loader2,
  Camera,
  CheckCircle,
  Trash2
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { LLMService } from "@/api/integrations";

export default function InspectionDetails() {
  const location = useLocation();
  const inspectionId = getUrlParam(location.search, 'id');

  const [inspection, setInspection] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [error, setError] = useState(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      try {
        if (currentUser && currentUser.role !== 'admin' && !currentUser.is_admin) {
          setError("Access denied. Admin privileges required.");
          return;
        }
        await loadInspectionData();
      } catch (error) {
        setError("Failed to verify admin access.");
      } finally {
        setLoading(false);
      }
    };

    console.log("🔍 DEBUG: URL search params:", location.search);
    console.log("🔍 DEBUG: Inspection ID from params:", inspectionId);

    if (inspectionId) {
      checkUserAndLoadData();
    } else {
      console.error("No inspection ID found in URL parameters");
      console.log("🔍 DEBUG: Available URL parameters:", new URLSearchParams(location.search).toString());
      setError("No inspection ID provided");
      setLoading(false);
    }
  }, [inspectionId, currentUser]);

  const loadInspectionData = async () => {
    try {
      const inspectionData = await MoldInspection.filter({ id: inspectionId });
      if (inspectionData && inspectionData.length > 0) {
        setInspection(inspectionData[0]);
        
        const samplesData = await Sample.findMany({ inspection_id: inspectionId });
        setSamples(samplesData || []);
      } else {
        setError("Inspection not found");
      }
    } catch (error) {
      console.error("Error loading inspection:", error);
      setError("Failed to load inspection data");
    }
  };

  const handleLabImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, GIF, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadingImage(true);
    try {
      console.log("🔍 DEBUG: Uploading lab image:", file.name, file.size, file.type);
      
      // Use the new upload service
      const uploadResult = await LLMService.uploadFile(file);
      console.log("🔍 DEBUG: Upload result:", uploadResult);
      
      const file_url = uploadResult.file_url || uploadResult.url;
      
      if (!file_url) {
        throw new Error('Upload failed: No file URL returned');
      }
      
      // Update inspection with lab image URL
      await MoldInspection.update(inspection.id, {
        lab_analysis_image_url: file_url
      });

      console.log("🔍 DEBUG: Lab image URL saved:", file_url);

      // Generate conclusions and recommendations based on the lab image
      await generateAnalysisFromImage(file_url);
      
      // Reload inspection data
      await loadInspectionData();
      
      alert('Lab analysis image uploaded successfully!');
      
    } catch (error) {
      console.error("❌ Error uploading lab image:", error);
      alert(`Failed to upload lab analysis image: ${error.message}`);
    } finally {
      setUploadingImage(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const generateAnalysisFromImage = async (imageUrl) => {
    setGeneratingAnalysis(true);
    try {
      const prompt = `
Analyze this laboratory mold analysis report image and provide professional conclusions and recommendations.

Context:
- Property: ${inspection.street_address}, ${inspection.city}, ${inspection.state}
- Square Footage: ${inspection.square_footage} sq ft
- Client Type: ${inspection.client_type}
- Visible Mold Present: ${inspection.has_visible_mold ? 'Yes' : 'No'}
- Water Damage Present: ${inspection.has_water_damage ? 'Yes' : 'No'}
- Background: ${inspection.background_info || 'None provided'}

Please analyze the lab results shown in this image and provide:

1. CONCLUSION (2-3 paragraphs):
   - Summarize the lab findings
   - Assess the mold levels and types found
   - Evaluate health and safety implications
   - Compare to normal/acceptable levels

2. RECOMMENDATIONS (detailed list):
   - Immediate actions needed (if any)
   - Preventive measures
   - Professional services recommended
   - Timeline for any required actions
   - Environmental controls to implement

Make the analysis professional, specific, and actionable. Focus on practical guidance for the property owner.

Return your response in this exact JSON format:
{
  "conclusion": "Your detailed conclusion here...",
  "recommendations": "Your detailed recommendations here..."
}
`;

      const analysis = await InvokeLLM({
        prompt: prompt,
        file_urls: [imageUrl],
        response_json_schema: {
          type: "object",
          properties: {
            conclusion: { type: "string" },
            recommendations: { type: "string" }
          },
          required: ["conclusion", "recommendations"]
        }
      });

      // Update inspection with generated analysis
      await MoldInspection.update(inspection.id, {
        conclusion: analysis.conclusion,
        recommendations: analysis.recommendations
      });

    } catch (error) {
      console.error("Error generating analysis:", error);
      alert("Failed to generate analysis. You can add conclusions and recommendations manually.");
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await MoldInspection.update(inspection.id, {
        conclusion: inspection.conclusion,
        recommendations: inspection.recommendations
      });
      alert("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getDisplayNumber = (inspection) => {
    return inspection?.inspection_number ? `MTH #${inspection.inspection_number}` : `MTH #${inspection?.id}`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-lg text-slate-600">Loading inspection details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <Link to={createPageUrl("AdminDashboard")}>
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="text-center">
          <div className="text-lg text-slate-600">Inspection not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="mb-8">
        <Link to={createPageUrl("AdminDashboard")} className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
          Back to Dashboard
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{getDisplayNumber(inspection)}</h1>
            <p className="text-slate-600 mt-2">
              Submitted {format(new Date(inspection.created_date), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          
          <Badge className={`px-3 py-1 text-sm ${
            inspection.status === 'completed' ? 'bg-green-100 text-green-800' :
            inspection.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {inspection.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Inspection Details */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Full Name</Label>
                  <p className="font-medium">{inspection.full_name}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Email</Label>
                  <p className="font-medium">{inspection.email}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Client Type</Label>
                  <p className="font-medium capitalize">{inspection.client_type}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Property Type</Label>
                  <p className="font-medium capitalize">{inspection.property_type.replace('_', ' ')}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-slate-600">Property Address</Label>
                <p className="font-medium">
                  {inspection.street_address}{inspection.unit_number && `, ${inspection.unit_number}`}
                  <br />
                  {inspection.city}, {inspection.state} {inspection.zip_code}
                </p>
              </div>

              <div>
                <Label className="text-slate-600">Square Footage</Label>
                <p className="font-medium">{inspection.square_footage} sq ft</p>
              </div>

              {inspection.background_info && (
                <div>
                  <Label className="text-slate-600">Background Information</Label>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg mt-1">
                    {inspection.background_info}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assessment Results */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Visible Mold</Label>
                  <Badge variant={inspection.has_visible_mold ? "destructive" : "secondary"} className="ml-2">
                    {inspection.has_visible_mold ? "Present" : "Not Present"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-slate-600">Water Damage</Label>
                  <Badge variant={inspection.has_water_damage ? "default" : "secondary"} className="ml-2">
                    {inspection.has_water_damage ? "Present" : "Not Present"}
                  </Badge>
                </div>
              </div>

              {inspection.has_visible_mold && inspection.visible_mold_details && (
                <div>
                  <Label className="text-slate-600">Mold Locations</Label>
                  <div className="space-y-2 mt-2">
                    {inspection.visible_mold_details.map((detail, index) => (
                      <div key={index} className="bg-slate-50 p-3 rounded-lg">
                        <p className="font-medium">Location {index + 1}: {detail.location}</p>
                        {detail.images && detail.images.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {detail.images.map((image, imgIndex) => (
                              <img
                                key={imgIndex}
                                src={image}
                                alt={`Mold evidence ${index + 1}-${imgIndex + 1}`}
                                className="w-full h-16 object-cover rounded border"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inspection.has_water_damage && inspection.water_damage_details && (
                <div>
                  <Label className="text-slate-600">Water Damage Locations</Label>
                  <div className="space-y-2 mt-2">
                    {inspection.water_damage_details.map((detail, index) => (
                      <div key={index} className="bg-slate-50 p-3 rounded-lg">
                        <p className="font-medium">Location {index + 1}: {detail.location}</p>
                        {detail.images && detail.images.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {detail.images.map((image, imgIndex) => (
                              <img
                                key={imgIndex}
                                src={image}
                                alt={`Water damage evidence ${index + 1}-${imgIndex + 1}`}
                                className="w-full h-16 object-cover rounded border"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Samples Collected */}
          {samples.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5" />
                  Samples Collected ({samples.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {samples.map((sample, index) => (
                    <div key={sample.id} className="bg-slate-50 p-3 rounded-lg">
                      <p className="font-medium">Sample {index + 1}: {sample.location}</p>
                      {sample.description && (
                        <p className="text-sm text-slate-600 mt-1">{sample.description}</p>
                      )}
                      {sample.sample_image && (
                        <img
                          src={sample.sample_image}
                          alt={`Sample ${index + 1}`}
                          className="w-24 h-24 object-cover rounded border mt-2"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Lab Analysis & Report */}
        <div className="space-y-6">
          {/* Lab Analysis Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Lab Analysis
              </CardTitle>
              <CardDescription>
                Upload and analyze laboratory mold test results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!inspection.lab_analysis_image_url ? (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLabImageUpload}
                    className="hidden"
                    id="lab-analysis-upload"
                    disabled={uploadingImage}
                  />
                  <label htmlFor="lab-analysis-upload" className="cursor-pointer block">
                    <div className="flex flex-col items-center">
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                          <p className="text-blue-600 font-medium text-lg">Uploading...</p>
                          <p className="text-slate-500 text-sm mt-2">Please wait while we process your image</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-slate-400 mb-4" />
                          <p className="text-slate-600 font-medium text-lg">Upload Lab Analysis Image</p>
                          <p className="text-slate-500 text-sm mt-2">
                            Click to select an image of the lab analysis results
                          </p>
                          <p className="text-slate-400 text-xs mt-2">
                            Supports: JPEG, PNG, GIF • Max size: 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <Label className="text-slate-600 font-medium">Lab Analysis Image</Label>
                    <div className="mt-3 relative group">
                      <img
                        src={inspection.lab_analysis_image_url}
                        alt="Lab Analysis Results"
                        className="w-full max-w-full h-auto rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                        onClick={() => {
                          // Open image in new tab for full view
                          window.open(inspection.lab_analysis_image_url, '_blank');
                        }}
                        title="Click to view full size"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="bg-white bg-opacity-90 rounded-full p-2">
                            <Camera className="w-5 h-5 text-slate-700" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('lab-analysis-upload').click()}
                        disabled={uploadingImage}
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Replace Image
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to remove this lab analysis image?')) {
                            MoldInspection.update(inspection.id, {
                              lab_analysis_image_url: null
                            }).then(() => {
                              loadInspectionData();
                            });
                          }
                        }}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLabImageUpload}
                    className="hidden"
                    id="lab-analysis-upload"
                    disabled={uploadingImage}
                  />
                </div>
              )}

              {generatingAnalysis && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <div>
                      <span className="text-blue-800 font-medium">Analyzing lab results...</span>
                      <p className="text-blue-700 text-sm mt-1">
                        AI is generating professional conclusions and recommendations based on the lab analysis.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {inspection.lab_analysis_image_url && !generatingAnalysis && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">Lab analysis uploaded successfully</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    The image has been processed and is ready for analysis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conclusions & Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Report Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="conclusion">Conclusion</Label>
                <Textarea
                  id="conclusion"
                  value={inspection.conclusion || ""}
                  onChange={(e) => setInspection({...inspection, conclusion: e.target.value})}
                  placeholder="Professional conclusion based on lab analysis..."
                  className="min-h-32 mt-2"
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={inspection.recommendations || ""}
                  onChange={(e) => setInspection({...inspection, recommendations: e.target.value})}
                  placeholder="Detailed recommendations for the client..."
                  className="min-h-32 mt-2"
                />
              </div>

              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}