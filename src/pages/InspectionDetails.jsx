import React, { useState, useEffect } from "react";
import { MoldInspection } from "@/api/entities";
import { Sample } from "@/api/entities";
import { UploadLabAnalysisImage } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Download, ArrowLeft, FileText, AlertTriangle, CheckCircle, Clock, User, MapPin, Calendar, Home, Mail, Phone, Thermometer, Droplets, FlaskConical, Eye, Edit, Save, Upload, X, Plus, Trash2, Star, ShieldCheck, Database, Image, File, MoreHorizontal, Send, CheckCircle2, XCircle, PauseCircle, PlayCircle, RotateCcw, Zap, BarChart3, PieChart, TrendingUp, Users, Search, Filter, RefreshCw, Loader2, Download as DownloadIcon, Mail as MailIcon, Eye as EyeIcon, Edit as EditIcon, Trash2 as Trash2Icon, Plus as PlusIcon, X as XIcon, Star as StarIcon, ShieldCheck as ShieldCheckIcon, Database as DatabaseIcon, Image as ImageIcon, File as FileIcon, MoreHorizontal as MoreHorizontalIcon, Send as SendIcon, CheckCircle2 as CheckCircle2Icon, XCircle as XCircleIcon, PauseCircle as PauseCircleIcon, PlayCircle as PlayCircleIcon, RotateCcw as RotateCcwIcon, Zap as ZapIcon, BarChart3 as BarChart3Icon, PieChart as PieChartIcon, TrendingUp as TrendingUpIcon, Users as UsersIcon, Search as SearchIcon, Filter as FilterIcon, RefreshCw as RefreshCcwIcon } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getDisplayNumber } from "@/utils/inspectionUtils";
import { getUrlParam } from "@/utils/urlUtils";
import { useAuth } from '@/contexts/AuthContext';
import { format } from "date-fns";

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
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate that we have an inspection ID
    if (!inspectionId) {
      alert('Error: No inspection ID found. Please refresh the page and try again.');
      return;
    }

    // Validate that inspection data is loaded
    if (!inspection) {
      alert('Error: Inspection data not loaded. Please wait and try again.');
      return;
    }

    setUploadingImage(true);
    try {
      console.log("🔍 DEBUG: Uploading lab images:", files.length, "files");
      console.log("🔍 DEBUG: Inspection ID:", inspectionId);
      console.log("🔍 DEBUG: Inspection object:", inspection);
      
      const uploadedUrls = [];
      
      // Upload each file to Supabase Storage
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`File "${file.name}" is not an image. Please select image files only.`);
          continue;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
          continue;
        }

        console.log("🔍 DEBUG: Uploading lab image:", file.name, file.size, file.type);
        
        // Use the new upload service
        const uploadResult = await UploadLabAnalysisImage(file);
        console.log("🔍 DEBUG: Upload result:", uploadResult);
        
        const file_url = uploadResult.file_url || uploadResult.url;
        
        if (!file_url) {
          throw new Error(`Upload failed for ${file.name}: No file URL returned`);
        }
        
        uploadedUrls.push(file_url);
        console.log("🔍 DEBUG: Lab image URL saved:", file_url);
      }
      
      if (uploadedUrls.length === 0) {
        throw new Error('No valid images were uploaded');
      }
      
      // Get current lab_analysis_images array or create new one
      const currentImages = inspection.lab_analysis_images || [];
      const updatedImages = [...currentImages, ...uploadedUrls];
      
      console.log("🔍 DEBUG: Updating inspection with ID:", inspectionId);
      console.log("🔍 DEBUG: Current images:", currentImages);
      console.log("🔍 DEBUG: Updated images:", updatedImages);
      
      // Update inspection with new lab analysis image URLs
      await MoldInspection.update(inspectionId, {
        lab_analysis_images: updatedImages
      });

      console.log("🔍 DEBUG: Lab analysis images updated successfully");

      // Generate conclusions and recommendations based on the first uploaded image
      if (uploadedUrls.length > 0) {
        await generateAnalysisFromImage(uploadedUrls[0]);
      }
      
      // Reload inspection data
      await loadInspectionData();
      
      alert(`Successfully uploaded ${uploadedUrls.length} lab analysis image(s)!`);
      
    } catch (error) {
      console.error("❌ Error uploading lab images:", error);
      alert(`Failed to upload lab analysis images: ${error.message}`);
    } finally {
      setUploadingImage(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const generateAnalysisFromImage = async (imageUrl) => {
    setGeneratingAnalysis(true);
    try {
      // Validate that we have an inspection ID and inspection data
      if (!inspectionId) {
        throw new Error('No inspection ID found');
      }

      if (!inspection) {
        throw new Error('Inspection data not loaded');
      }

      console.log("🔍 DEBUG: Generating analysis for inspection ID:", inspectionId);
      console.log("🔍 DEBUG: Image URL:", imageUrl);

      // Mock LLM analysis since LLMService is removed
      const mockAnalysis = {
        conclusion: `Based on the laboratory analysis of the mold samples from ${inspection.street_address}, ${inspection.city}, ${inspection.state}, the results indicate [mock conclusion]. This analysis was performed on a ${inspection.square_footage} sq ft ${inspection.client_type} property.`,
        recommendations: `1. Immediate Actions: [mock recommendations]\n2. Preventive Measures: [mock preventive measures]\n3. Professional Services: [mock professional services]\n4. Timeline: [mock timeline]\n5. Environmental Controls: [mock environmental controls]`
      };

      console.log("🔍 DEBUG: Mock analysis generated successfully:", mockAnalysis);

      // Update inspection with generated analysis
      await MoldInspection.update(inspectionId, {
        conclusion: mockAnalysis.conclusion,
        recommendations: mockAnalysis.recommendations
      });

      console.log("🔍 DEBUG: Analysis saved to inspection successfully");

    } catch (error) {
      console.error("❌ Error generating analysis:", error);
      alert("Failed to generate analysis. You can add conclusions and recommendations manually.");
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate that we have an inspection ID and inspection data
      if (!inspectionId) {
        throw new Error('No inspection ID found');
      }

      if (!inspection) {
        throw new Error('Inspection data not loaded');
      }

      console.log("🔍 DEBUG: Saving changes for inspection ID:", inspectionId);
      console.log("🔍 DEBUG: Conclusion:", inspection.conclusion);
      console.log("🔍 DEBUG: Recommendations:", inspection.recommendations);

      await MoldInspection.update(inspectionId, {
        conclusion: inspection.conclusion,
        recommendations: inspection.recommendations
      });

      console.log("🔍 DEBUG: Changes saved successfully");
      alert("Changes saved successfully!");
    } catch (error) {
      console.error("❌ Error saving:", error);
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
                <User className="w-5 h-5" />
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
              {(!inspection.lab_analysis_images || inspection.lab_analysis_images.length === 0) ? (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
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
                          <p className="text-slate-500 text-sm mt-2">Please wait while we process your images</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-slate-400 mb-4" />
                          <p className="text-slate-600 font-medium text-lg">Upload Lab Analysis Images</p>
                          <p className="text-slate-500 text-sm mt-2">
                            Click to select one or more images of the lab analysis results
                          </p>
                          <p className="text-slate-400 text-xs mt-2">
                            Supports: JPEG, PNG, GIF • Max size: 10MB per image
                          </p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <Label className="text-slate-600 font-medium">
                      Lab Analysis Images ({inspection.lab_analysis_images.length})
                    </Label>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {inspection.lab_analysis_images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Lab Analysis Results ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                            onClick={() => {
                              // Open image in new tab for full view
                              window.open(imageUrl, '_blank');
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
                          
                          {/* Remove button for individual image */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove lab analysis image ${index + 1}?`)) {
                                const updatedImages = inspection.lab_analysis_images.filter((_, i) => i !== index);
                                console.log("🔍 DEBUG: Removing image at index:", index);
                                console.log("🔍 DEBUG: Updated images:", updatedImages);
                                MoldInspection.update(inspectionId, {
                                  lab_analysis_images: updatedImages
                                }).then(() => {
                                  loadInspectionData();
                                }).catch((error) => {
                                  console.error("❌ Error removing image:", error);
                                  alert("Failed to remove image. Please try again.");
                                });
                              }
                            }}
                            className="absolute top-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
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
                        Add More Images
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to remove all lab analysis images?')) {
                            console.log("🔍 DEBUG: Removing all lab analysis images for inspection ID:", inspectionId);
                            MoldInspection.update(inspectionId, {
                              lab_analysis_images: []
                            }).then(() => {
                              loadInspectionData();
                            }).catch((error) => {
                              console.error("❌ Error removing all images:", error);
                              alert("Failed to remove all images. Please try again.");
                            });
                          }
                        }}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove All
                      </Button>
                    </div>
                  </div>
                  
                  <input
                    type="file"
                    accept="image/*"
                    multiple
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

              {inspection.lab_analysis_images && inspection.lab_analysis_images.length > 0 && !generatingAnalysis && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">
                      {inspection.lab_analysis_images.length} lab analysis image(s) uploaded successfully
                    </span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    The images have been processed and are ready for analysis.
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