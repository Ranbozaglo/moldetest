import React, { useState, useEffect } from "react";
import { MoldInspection } from "@/api/entities";
import { Sample } from "@/api/entities";
import { UploadLabAnalysisImage } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Download, ArrowLeft, FileText, AlertTriangle, CheckCircle, Clock, User, MapPin, Calendar, Home, Mail, Phone, Thermometer, Droplets, FlaskConical, Eye, Edit, Save, Upload, X, Plus, Trash2, Star, ShieldCheck, Database, Image, File, MoreHorizontal, Send, CheckCircle2, XCircle, PauseCircle, PlayCircle, RotateCcw, Zap, BarChart3, PieChart, TrendingUp, Users, Search, Filter, RefreshCw, Loader2, Download as DownloadIcon, Mail as MailIcon, Eye as EyeIcon, Edit as EditIcon, Trash2 as Trash2Icon, Plus as PlusIcon, X as XIcon, Star as StarIcon, ShieldCheck as ShieldCheckIcon, Database as DatabaseIcon, Image as ImageIcon, File as FileIcon, MoreHorizontal as MoreHorizontalIcon, Send as SendIcon, CheckCircle2 as CheckCircle2Icon, XCircle as XCircleIcon, PauseCircle as PauseCircleIcon, PlayCircle as PlayCircleIcon, RotateCcw as RotateCcwIcon, Zap as ZapIcon, BarChart3 as BarChart3Icon, PieChart as PieChartIcon, TrendingUp as TrendingUpIcon, Users as UsersIcon, Search as SearchIcon, Filter as FilterIcon, RefreshCw as RefreshCcwIcon, ImageOff, ZoomIn, Copy } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getDisplayNumber } from "@/utils/inspectionUtils";
import { getUrlParam } from "@/utils/urlUtils";
import { useAuth } from '@/contexts/AuthContext';
import { format } from "date-fns";
import { Core } from "@/api/integrations";
// Removed requireSupabaseSession - using Flask backend authentication

export default function InspectionDetails() {
  const location = useLocation();
  const inspectionId = getUrlParam(location.search, 'id');

  const [inspection, setInspection] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [processingImages, setProcessingImages] = useState(false);
  const [error, setError] = useState(null);
  const { user: currentUser } = useAuth();

      useEffect(() => {
      (async () => {
        try {
          // Skip Supabase session check - using Flask backend authentication
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
      } catch (err) {
        console.error("🔍 DEBUG: Auth check failed:", err);
        setError('You must be logged in to view this page.');
        setLoading(false);
      }
    })();
  }, [inspectionId, currentUser]);

  // Reload data when component mounts or inspectionId changes
  useEffect(() => {
    if (inspectionId && !loading) {
      console.log("🔍 DEBUG: Reloading inspection data due to inspectionId change");
      loadInspectionData();
    }
  }, [inspectionId]);

  const loadInspectionData = async () => {
    try {
      const inspectionData = await MoldInspection.filter({ id: inspectionId });
      if (inspectionData && inspectionData.length > 0) {
        const inspection = inspectionData[0];
        console.log("🔍 DEBUG: Loaded inspection data:", inspection);
        console.log("🔍 DEBUG: lab_analysis_images type:", typeof inspection.lab_analysis_images);
        console.log("🔍 DEBUG: lab_analysis_images value:", inspection.lab_analysis_images);
        
        // Ensure lab_analysis_images is always an array
        if (inspection.lab_analysis_images && typeof inspection.lab_analysis_images === 'string') {
          try {
            inspection.lab_analysis_images = JSON.parse(inspection.lab_analysis_images);
            console.log("🔍 DEBUG: Parsed lab_analysis_images:", inspection.lab_analysis_images);
          } catch (parseError) {
            console.error("❌ Error parsing lab_analysis_images JSON:", parseError);
            inspection.lab_analysis_images = [];
          }
        } else if (!inspection.lab_analysis_images) {
          inspection.lab_analysis_images = [];
        }
        
        setInspection(inspection);
        
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
    // Skip Supabase session check - using Flask backend authentication
    // Auth is handled by the AuthContext and route guards
    
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
    setProcessingImages(true);
    setTotalFiles(files.length);
    setUploadedCount(0);
    setUploadProgress(0);
    
    try {
      console.log("🔍 DEBUG: Starting lab image upload process");
      console.log("🔍 DEBUG: Inspection ID:", inspectionId);
      console.log("🔍 DEBUG: Files to upload:", files.length);
      
      // Step 1: Upload each file to lab-analysis bucket
      const uploadedUrls = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress
        setUploadedCount(i + 1);
        setUploadProgress(((i + 1) / files.length) * 100);
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file: ${file.name}`);
          alert(`File "${file.name}" is not an image. Please select image files only.`);
          continue;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          console.warn(`File too large: ${file.name} (${file.size} bytes)`);
          alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
          continue;
        }

        console.log("🔍 DEBUG: Uploading lab image:", file.name, file.size, file.type);
        
        // Step 2: Upload to lab-analysis bucket and get public URL
        const uploadResult = await UploadLabAnalysisImage(file);
        console.log("🔍 DEBUG: Upload result:", uploadResult);
        
        const file_url = uploadResult.file_url || uploadResult.url;
        
        if (!file_url) {
          console.error(`Upload failed for ${file.name}: No file URL returned`);
          throw new Error(`Upload failed for ${file.name}: No file URL returned`);
        }
        
        console.log("🔍 DEBUG: Successfully uploaded to lab-analysis bucket:", file_url);
        uploadedUrls.push(file_url);
      }
      
      if (uploadedUrls.length === 0) {
        throw new Error('No valid images were uploaded');
      }
      
      // Step 3: Fetch current lab_analysis_images array from inspection record
      console.log("🔍 DEBUG: Fetching current inspection data for ID:", inspectionId);
      const currentInspection = await MoldInspection.filter({ id: inspectionId });
      
      if (!currentInspection || currentInspection.length === 0) {
        throw new Error('Inspection record not found');
      }
      
      let currentImages = currentInspection[0].lab_analysis_images || [];
      console.log("🔍 DEBUG: Current lab_analysis_images raw value:", currentInspection[0].lab_analysis_images);
      console.log("🔍 DEBUG: Current lab_analysis_images type:", typeof currentInspection[0].lab_analysis_images);
      
      // Handle case where lab_analysis_images is a JSON string
      if (typeof currentImages === 'string') {
        try {
          currentImages = JSON.parse(currentImages);
          console.log("🔍 DEBUG: Parsed lab_analysis_images from JSON string:", currentImages);
        } catch (parseError) {
          console.error("❌ Error parsing lab_analysis_images JSON:", parseError);
          currentImages = [];
        }
      }
      
      console.log("🔍 DEBUG: Current lab_analysis_images array:", currentImages);
      
      // Step 4: Append new URLs to the array
      const updatedImages = [...currentImages, ...uploadedUrls];
      console.log("🔍 DEBUG: Updated lab_analysis_images array:", updatedImages);
      
      // Step 5: Update the inspection record with the updated array
      console.log("🔍 DEBUG: MoldInspection.update called with:", {
        inspectionId,
        lab_analysis_images: updatedImages
      });
      
      const updateResult = await MoldInspection.update(inspectionId, {
        lab_analysis_images: updatedImages
      });

      console.log("🔍 DEBUG: Update result from API:", updateResult);
      console.log("🔍 DEBUG: Inspection record updated successfully");

      // Small delay to ensure database commit
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload the data from the server to ensure consistency and proper JSON parsing
      console.log("🔍 DEBUG: Reloading inspection data from server after upload");
      await loadInspectionData();
      
      console.log("🔍 DEBUG: Inspection data reloaded successfully");

      // Generate conclusions and recommendations based on the first uploaded image
      if (uploadedUrls.length > 0) {
        console.log("🔍 DEBUG: Generating analysis from first uploaded image");
        await generateAnalysisFromImage(uploadedUrls[0]);
      }
      
      // Show success message with immediate visual feedback
      console.log("🔍 DEBUG: Upload completed successfully, images should now be visible");
      alert(`Successfully uploaded ${uploadedUrls.length} lab analysis image(s) to the inspection record!`);
      
    } catch (error) {
      console.error("❌ Error in lab image upload process:", error);
      alert(`Failed to upload lab analysis images: ${error.message}`);
    } finally {
      setUploadingImage(false);
      setProcessingImages(false);
      setUploadProgress(0);
      setUploadedCount(0);
      setTotalFiles(0);
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

      console.log("🔍 DEBUG: Generating OCR analysis for inspection ID:", inspectionId);
      console.log("🔍 DEBUG: Image URL:", imageUrl);

      // Use OCR-GPT backend to analyze the uploaded image
      const ocrPrompt = `
Analyze this laboratory mold analysis report image and provide professional conclusions and recommendations.

Context:
- This is a mold inspection and testing report from ${inspection.street_address}, ${inspection.city}, ${inspection.state}
- Property type: ${inspection.property_type} (${inspection.square_footage} sq ft)
- Client type: ${inspection.client_type}
- Focus on health and safety implications
- Provide actionable recommendations

Please analyze the lab results shown in this image and provide:

1. **CONCLUSION** (2-3 paragraphs):
   - Summarize the lab findings and extracted text
   - Assess the mold levels and types found
   - Evaluate health and safety implications
   - Compare to normal/acceptable levels
   - Consider the property context and client type

2. **RECOMMENDATIONS** (detailed list):
   - Immediate actions needed (if any)
   - Preventive measures
   - Professional services recommended
   - Timeline for any required actions
   - Environmental controls to implement
   - Follow-up testing recommendations

Make the analysis professional, specific, and actionable. Focus on practical guidance for the property owner.

Return your response in this exact JSON format:
{
  "conclusion": "Your detailed conclusion here...",
  "recommendations": "Your detailed recommendations here..."
}
`;

      console.log("🔍 DEBUG: Calling OCR-GPT backend with image URL:", imageUrl);
      
      // Call the OCR-GPT backend
      const analysisResult = await Core.InvokeLLM(ocrPrompt, [imageUrl]);
      console.log("🔍 DEBUG: OCR-GPT analysis result:", analysisResult);

      // Parse the response to extract conclusion and recommendations
      let conclusion = "";
      let recommendations = "";

      try {
        // Try to parse as JSON first
        const parsedResult = JSON.parse(analysisResult.content);
        conclusion = parsedResult.conclusion || analysisResult.content;
        recommendations = parsedResult.recommendations || "";
      } catch (parseError) {
        console.warn("⚠️ Failed to parse OCR result as JSON, using raw content:", parseError);
        // If JSON parsing fails, use the raw content
        conclusion = analysisResult.content;
        recommendations = "Please review the lab analysis results and consult with a professional for specific recommendations.";
      }

      console.log("🔍 DEBUG: Parsed analysis - Conclusion:", conclusion);
      console.log("🔍 DEBUG: Parsed analysis - Recommendations:", recommendations);

      // Update inspection with generated analysis
      await MoldInspection.update(inspectionId, {
        conclusion: conclusion,
        recommendations: recommendations
      });

      console.log("🔍 DEBUG: OCR analysis saved to inspection successfully");

    } catch (error) {
      console.error("❌ Error generating OCR analysis:", error);
      
      // Fallback to mock analysis if OCR fails
      console.log("🔍 DEBUG: Falling back to mock analysis due to OCR error");
      const mockAnalysis = {
        conclusion: `Based on the laboratory analysis of the mold samples from ${inspection.street_address}, ${inspection.city}, ${inspection.state}, the results indicate [OCR analysis failed - please review manually]. This analysis was performed on a ${inspection.square_footage} sq ft ${inspection.client_type} property.`,
        recommendations: `1. Immediate Actions: [Please review lab results manually]\n2. Preventive Measures: [Review with professional]\n3. Professional Services: [Consult mold specialist]\n4. Timeline: [Based on lab results]\n5. Environmental Controls: [Implement as needed]`
      };

      await MoldInspection.update(inspectionId, {
        conclusion: mockAnalysis.conclusion,
        recommendations: mockAnalysis.recommendations
      });

      alert("OCR analysis failed. Please review the lab results manually and add conclusions and recommendations.");
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
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Assessment Results & Findings
              </CardTitle>
              <CardDescription>
                Comprehensive analysis of visible mold, water damage, and environmental conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                    inspection.has_visible_mold ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Visible Mold</p>
                  <Badge variant={inspection.has_visible_mold ? "destructive" : "secondary"} className="mt-1">
                    {inspection.has_visible_mold ? "Present" : "Not Detected"}
                  </Badge>
                </div>
                
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                    inspection.has_water_damage ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                  }`}>
                    <Droplets className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Water Damage</p>
                  <Badge variant={inspection.has_water_damage ? "default" : "secondary"} className="mt-1">
                    {inspection.has_water_damage ? "Present" : "Not Detected"}
                  </Badge>
                </div>
                
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                    inspection.humidity && parseFloat(inspection.humidity) > 60 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                  }`}>
                    <Thermometer className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Environment</p>
                  <Badge variant={inspection.humidity && parseFloat(inspection.humidity) > 60 ? "outline" : "secondary"} className="mt-1">
                    {inspection.humidity && parseFloat(inspection.humidity) > 60 ? "High Humidity" : "Normal"}
                  </Badge>
                </div>
              </div>

              {/* Visible Mold Details */}
              {inspection.has_visible_mold && inspection.visible_mold_details && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <Label className="text-slate-700 font-semibold text-lg">Visible Mold Locations</Label>
                  </div>
                  <div className="space-y-3">
                    {inspection.visible_mold_details.map((detail, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 p-4 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-red-800">Location {index + 1}: {detail.location}</p>
                            <p className="text-sm text-red-600 mt-1">
                              ⚠️ Visible mold detected - requires immediate attention
                            </p>
                          </div>
                          <Badge variant="destructive" className="ml-2">High Priority</Badge>
                        </div>
                        {detail.images && detail.images.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                            {detail.images.map((image, imgIndex) => (
                              <div key={imgIndex} className="relative group">
                                <img
                                  src={image}
                                  alt={`Mold evidence ${index + 1}-${imgIndex + 1}`}
                                  className="w-full h-20 object-cover rounded border-2 border-red-300"
                                />
                                <div className="absolute inset-0 bg-red-900 bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100">
                                    Mold Evidence
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Water Damage Details */}
              {inspection.has_water_damage && inspection.water_damage_details && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-orange-600" />
                    <Label className="text-slate-700 font-semibold text-lg">Water Damage Locations</Label>
                  </div>
                  <div className="space-y-3">
                    {inspection.water_damage_details.map((detail, index) => (
                      <div key={index} className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-orange-800">Location {index + 1}: {detail.location}</p>
                            <p className="text-sm text-orange-600 mt-1">
                              💧 Water damage detected - may contribute to mold growth
                            </p>
                          </div>
                          <Badge variant="default" className="ml-2">Medium Priority</Badge>
                        </div>
                        {detail.images && detail.images.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                            {detail.images.map((image, imgIndex) => (
                              <div key={imgIndex} className="relative group">
                                <img
                                  src={image}
                                  alt={`Water damage evidence ${index + 1}-${imgIndex + 1}`}
                                  className="w-full h-20 object-cover rounded border-2 border-orange-300"
                                />
                                <div className="absolute inset-0 bg-orange-900 bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100">
                                    Water Damage
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Environmental Conditions */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-blue-600" />
                  <Label className="text-slate-700 font-semibold text-lg">Environmental Conditions</Label>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  {inspection.environmental_data_method === 'photo' && inspection.thermostat_image ? (
                    <div className="space-y-3">
                      <p className="font-medium text-blue-800">Thermostat Reading</p>
                      <div className="max-w-md">
                        <img
                          src={inspection.thermostat_image}
                          alt="Thermostat reading"
                          className="w-full h-auto rounded border-2 border-blue-300"
                        />
                      </div>
                    </div>
                  ) : inspection.environmental_data_method === 'manual' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-blue-800">Temperature</p>
                        <p className="text-lg font-semibold">{inspection.temperature || 'N/A'}°F</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-800">Humidity</p>
                        <p className={`text-lg font-semibold ${inspection.humidity && parseFloat(inspection.humidity) > 60 ? 'text-red-600' : ''}`}>
                          {inspection.humidity || 'N/A'}%
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-blue-600">Environmental data not provided</p>
                  )}
                  
                  {inspection.humidity && parseFloat(inspection.humidity) > 60 && (
                    <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <p className="text-sm font-medium text-yellow-800">
                          ⚠️ HUMIDITY WARNING: The EPA recommends relative humidity levels at or below 60% to prevent mold growth. 
                          Current humidity of {inspection.humidity}% may contribute to mold development.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <Label className="text-slate-700 font-semibold text-lg">Initial Recommendations</Label>
                </div>
                
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-2">
                  {inspection.has_visible_mold && (
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-green-800">
                        <strong>Immediate Action Required:</strong> Visible mold detected. Consider professional mold assessment and remediation.
                      </p>
                    </div>
                  )}
                  
                  {inspection.has_water_damage && (
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-green-800">
                        <strong>Water Damage:</strong> Address water damage promptly to prevent mold growth.
                      </p>
                    </div>
                  )}
                  
                  {inspection.humidity && parseFloat(inspection.humidity) > 60 && (
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-green-800">
                        <strong>High Humidity:</strong> Consider dehumidification and HVAC system maintenance.
                      </p>
                    </div>
                  )}
                  
                  {!inspection.has_visible_mold && !inspection.has_water_damage && (!inspection.humidity || parseFloat(inspection.humidity) <= 60) && (
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-green-800">
                        <strong>Good Conditions:</strong> No immediate concerns detected. Continue regular monitoring.
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
              {/* Debug: Log lab analysis images state */}
              {console.log("🔍 DEBUG: Rendering lab analysis section with images:", inspection.lab_analysis_images)}
              {console.log("🔍 DEBUG: Images array length:", inspection.lab_analysis_images ? inspection.lab_analysis_images.length : 'undefined')}
              {console.log("🔍 DEBUG: Images array type:", typeof inspection.lab_analysis_images)}
              
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
                          <p className="text-blue-600 font-medium text-lg">Uploading Images...</p>
                          <p className="text-slate-500 text-sm mt-2">Please wait while we upload and process your images</p>
                          <div className="mt-4 w-full max-w-xs">
                            <div className="bg-slate-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: `${uploadProgress}%`}}></div>
                            </div>
                            <p className="text-slate-500 text-xs mt-1">
                              {uploadedCount} of {totalFiles} files uploaded
                            </p>
                          </div>
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
                            onError={(e) => {
                              console.error(`❌ Failed to load image ${index + 1}:`, imageUrl);
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                          {/* Fallback for failed images */}
                          <div 
                            className="hidden w-full h-48 bg-slate-100 rounded-lg border-2 border-slate-200 flex items-center justify-center"
                            style={{display: 'none'}}
                          >
                            <div className="text-center">
                              <ImageOff className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-slate-500 text-sm">Image failed to load</p>
                            </div>
                          </div>
                          
                          {/* Image overlay with zoom icon */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="bg-white bg-opacity-90 rounded-full p-2">
                                <ZoomIn className="w-5 h-5 text-slate-700" />
                              </div>
                            </div>
                          </div>
                          
                          {/* Image info badge */}
                          <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                            Image {index + 1}
                          </div>
                          
                          {/* Remove button for individual image */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
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
                      
                      {inspection.lab_analysis_images && inspection.lab_analysis_images.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (confirm('Generate AI analysis for all uploaded lab images?')) {
                              try {
                                console.log("🔍 DEBUG: Manual OCR analysis triggered");
                                await generateAnalysisFromImage(inspection.lab_analysis_images[0]);
                              } catch (error) {
                                console.error("❌ Error in manual OCR analysis:", error);
                                alert("Failed to generate OCR analysis. Please try again.");
                              }
                            }
                          }}
                          disabled={generatingAnalysis}
                          className="flex items-center gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                        >
                          {generatingAnalysis ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                          {generatingAnalysis ? 'Analyzing...' : 'Analyze with AI'}
                        </Button>
                      )}
                      
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

              {processingImages && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
                    <div>
                      <span className="text-yellow-800 font-medium">Processing uploaded images...</span>
                      <p className="text-yellow-700 text-sm mt-1">
                        Images are being processed and will appear in the lab analysis section shortly.
                      </p>
                      {uploadProgress > 0 && (
                        <div className="mt-2">
                          <div className="bg-yellow-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-600 h-2 rounded-full transition-all duration-300" 
                              style={{width: `${uploadProgress}%`}}
                            ></div>
                          </div>
                          <p className="text-yellow-700 text-xs mt-1">
                            {uploadedCount} of {totalFiles} files processed
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
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
                    The images have been processed and are ready for analysis. Click on any image to view it in full size.
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