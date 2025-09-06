import React, { useState, useEffect } from "react";
import { MoldInspection, AsbestosInspection } from "@/api/entities";
import { Sample } from "@/api/entities";
import { ProcessLabImageWithOCR, InvokeLLM, UploadLabAnalysisImage } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Camera, Download, ArrowLeft, FileText, AlertTriangle, CheckCircle, Clock, User, MapPin, Calendar, Home, Mail, Phone, Thermometer, Droplets, FlaskConical, Eye, Edit, Save, Upload, X, Plus, Trash2, Star, Database, Image, File, MoreHorizontal, Send, CheckCircle2, XCircle, PauseCircle, PlayCircle, RotateCcw, Zap, BarChart3, PieChart, TrendingUp, Users, Search, Filter, RefreshCw, Loader2, Download as DownloadIcon, Mail as MailIcon, Eye as EyeIcon, Edit as EditIcon, Trash2 as Trash2Icon, Plus as PlusIcon, X as XIcon, Star as StarIcon, Database as DatabaseIcon, Image as ImageIcon, File as FileIcon, MoreHorizontal as MoreHorizontalIcon, Send as SendIcon, CheckCircle2 as CheckCircle2Icon, XCircle as XCircleIcon, PauseCircle as PauseCircleIcon, PlayCircle as PlayCircleIcon, RotateCcw as RotateCcwIcon, Zap as ZapIcon, BarChart3 as BarChart3Icon, PieChart as PieChartIcon, TrendingUp as TrendingUpIcon, Users as UsersIcon, Search as SearchIcon, Filter as FilterIcon, RefreshCw as RefreshCcwIcon, ImageOff, ZoomIn, Copy } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUrlParam } from "@/utils/urlUtils";
import { useAuth } from '@/contexts/AuthContext';
import { format } from "date-fns";
import { generateReportHtmlContent } from "@/pages/AdminDashboard.jsx";
import { getDisplayNumber } from "@/utils/inspectionUtils";
import { Core } from "@/api/integrations";
import { supabase } from "@/lib/supabase";
// Removed requireSupabaseSession - using Flask backend authentication

export default function InspectionDetails() {
  const location = useLocation();
  const inspectionId = getUrlParam(location.search, 'id');
  
  console.log("🔍 DEBUG: InspectionDetails component loaded");
  console.log("🔍 DEBUG: Location search:", location.search);
  console.log("🔍 DEBUG: Extracted inspectionId:", inspectionId);

  // Function to determine inspection type based on inspection data
  const getInspectionType = (inspection) => {
    // If the inspection already has an inspectionType property, use it
    if (inspection.inspectionType) {
      return inspection.inspectionType;
    }
    
    // Fallback to app_id if available
    if (inspection.app_id) {
      return inspection.app_id;
    }
    
    // Default to 'mold' for backward compatibility
    return 'mold';
  };

  // Function to clean and filter extracted text for mold-related content
  const cleanExtractedText = (extractedText) => {
    if (!extractedText || typeof extractedText !== 'string') {
      return '';
    }

    const lines = extractedText.split('\n');
    const relevantLines = [];
    let foundDirectExamination = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Start collecting from "DIRECT MICROSCOPIC EXAMINATION"
      if (trimmedLine.toUpperCase().includes('DIRECT MICROSCOPIC EXAMINATION')) {
        foundDirectExamination = true;
        relevantLines.push(trimmedLine);
        continue;
      }

      // Only process lines after finding the start marker
      if (!foundDirectExamination) {
        continue;
      }

      // Include lines with mold-related keywords
      const lowerLine = trimmedLine.toLowerCase();
      const hasMoldKeywords = 
        lowerLine.includes('mold') ||
        lowerLine.includes('spore') ||
        lowerLine.includes('species') ||
        lowerLine.includes('hyphae') ||
        lowerLine.includes('fungi') ||
        lowerLine.includes('fungal') ||
        /\b[1-4]\+\b/.test(trimmedLine) || // Ratings like "1+", "2+", "3+", "4+"
        /\b[1-4]\s*\+\s*\b/.test(trimmedLine); // Ratings with spaces like "1 +"

      if (hasMoldKeywords && trimmedLine.length > 0) {
        relevantLines.push(trimmedLine);
      }
    }

    return relevantLines.join('\n');
  };

  // Function to filter out irrelevant/noisy lines from OCR text
  const applyAutoFilters = (text) => {
    if (!text || typeof text !== 'string') return '';
    const nonInformativePhrases = [
      'date of report', 'www.', 'page', 'client:', 'c/o:', 're:', 'date of receipt', 'lab id-version'
    ];
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        if (line.length < 5) return false;
        if (/^[\d\W]+$/.test(line)) return false; // Only numbers or punctuation
        const lower = line.toLowerCase();
        if (nonInformativePhrases.some(phrase => lower.includes(phrase))) return false;
        return true;
      })
      .join('\n');
  };

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
  const [labImageErrors, setLabImageErrors] = useState({});
  const [selectedLabImages, setSelectedLabImages] = useState([]);
  const [inspectionType, setInspectionType] = useState(null);
  const [isEditingMaterials, setIsEditingMaterials] = useState(false);
  const [editingMaterialType, setEditingMaterialType] = useState('');
  const [editingMaterialCondition, setEditingMaterialCondition] = useState('');
  const [customMaterialType, setCustomMaterialType] = useState('');
  const { user: currentUser } = useAuth();

  // Debug useEffect to track inspection state changes
  useEffect(() => {
    if (inspection) {
      console.log("🔍 INSPECTION STATE CHANGE:");
      console.log("  - Lab Conclusion:", inspection.lab_conclusion || "EMPTY");
      console.log("  - Lab Recommendations:", inspection.lab_recommendations || "EMPTY");
    }
  }, [inspection?.lab_conclusion, inspection?.lab_recommendations]);

  useEffect(() => {(
    async () => {
      try {
          // Skip Supabase session check - using Flask backend authentication
        const checkUserAndLoadData = async () => {
          try {
            // Allow admin users to view any inspection
            if (currentUser && (currentUser.role === 'admin' || currentUser.is_admin)) {
              console.log("🔍 DEBUG: Admin user accessing inspection details");
              await loadInspectionData();
              return;
            }
            
            // For regular users, we'll check if they own the inspection after loading it
            console.log("🔍 DEBUG: Regular user accessing inspection details");
            await loadInspectionData();
          } catch (error) {
            console.error("🔍 ERROR: Failed to verify user access:", error);
            setError("Failed to verify access.");
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
    
    // Cleanup function to reset image errors when inspection changes
    return () => {
      console.log("🔍 DEBUG: InspectionDetails - resetting lab image errors for inspection change");
      setLabImageErrors({});
    };
  }, [inspectionId]);

  const loadInspectionData = async () => {
    try {
      console.log("🔍 DEBUG: loadInspectionData called with inspectionId:", inspectionId);
      
      if (!inspectionId) {
        console.error("❌ ERROR: No inspection ID provided");
        setError("No inspection ID provided");
        return;
      }
      
      // First, try to determine the inspection type by checking both entities
      let inspectionData = null;
      let currentInspectionType = null;
      
      // Try to find the inspection in mold inspections first
      try {
        console.log("🔍 DEBUG: Trying MoldInspection.findUnique with ID:", inspectionId);
        inspectionData = await MoldInspection.findUnique({ id: inspectionId });
        if (inspectionData) {
          currentInspectionType = 'mold';
          console.log("🔍 DEBUG: Found inspection in mold inspections");
        }
      } catch (error) {
        console.log("🔍 DEBUG: Inspection not found in mold inspections, trying asbestos...");
      }
      
      // If not found in mold, try asbestos inspections
      if (!inspectionData) {
        try {
          console.log("🔍 DEBUG: Trying AsbestosInspection.findUnique with ID:", inspectionId);
          inspectionData = await AsbestosInspection.findUnique({ id: inspectionId });
          if (inspectionData) {
            currentInspectionType = 'asbestos';
            console.log("🔍 DEBUG: Found inspection in asbestos inspections");
          }
        } catch (error) {
          console.log("🔍 DEBUG: Inspection not found in asbestos inspections either");
        }
      }
      
      if (!inspectionData) {
        console.error("❌ ERROR: No inspection data returned from either API");
        setError("Inspection not found");
        return;
      }
      
      const inspection = inspectionData;
      setInspectionType(currentInspectionType);
      
      console.log("🔍 DEBUG: Successfully loaded inspection:", {
        id: inspection.id,
        inspection_number: inspection.inspection_number,
        full_name: inspection.full_name,
        email: inspection.email,
        status: inspection.status,
        type: currentInspectionType
      });

      // Check if regular user is trying to access someone else's inspection
      if (currentUser && 
          currentUser.role !== 'admin' && 
          !currentUser.is_admin && 
          inspection.email !== currentUser.email) {
        console.error("❌ ERROR: Regular user trying to access inspection not owned by them");
        setError("Access denied. You can only view your own inspections.");
        return;
      }

      // Debug: Log the lab analysis fields from database
      console.log("🔍 DEBUG: Loading inspection data from database:");
      console.log("  - lab_conclusion:", inspection.lab_conclusion || "EMPTY");
      console.log("  - lab_recommendations:", inspection.lab_recommendations || "EMPTY");
      console.log("  - lab_analysis_images:", inspection.lab_analysis_images || "EMPTY");
      
      // Debug: Log asbestos-specific fields
      if (currentInspectionType === 'asbestos') {
        console.log("🔍 DEBUG: Asbestos-specific fields from asbestosinspection table:");
        console.log("  - Table: asbestosinspection");
        console.log("  - material_type:", inspection.material_type || "EMPTY");
        console.log("  - material_condition:", inspection.material_condition || "EMPTY");
        console.log("  - material_images:", inspection.material_images || "EMPTY");
        console.log("  - location_description:", inspection.location_description || "EMPTY");
        console.log("  - lab_analysis_images (raw from DB):", inspection.lab_analysis_images || "EMPTY");
        console.log("📋 DATA FLOW: AsbestosInspection.findUnique() → asbestosinspection.lab_analysis_images → display");
      }

      // Parse lab_analysis_images if it's a string
      if (inspection.lab_analysis_images && typeof inspection.lab_analysis_images === 'string') {
        try {
          inspection.lab_analysis_images = JSON.parse(inspection.lab_analysis_images);
        } catch (parseError) {
          console.error("❌ Error parsing lab_analysis_images JSON:", parseError);
          inspection.lab_analysis_images = [];
        }
      } else if (Array.isArray(inspection.lab_analysis_images)) {
        // Already an array, keep as is
      } else {
        // No lab analysis images, set to empty array
        inspection.lab_analysis_images = [];
      }
      
      // Debug: Log final parsed lab_analysis_images
      if (currentInspectionType === 'asbestos') {
        console.log("🔍 DEBUG: Final parsed lab_analysis_images for asbestos inspection:", inspection.lab_analysis_images);
        console.log("🔍 DEBUG: Number of lab analysis images:", inspection.lab_analysis_images ? inspection.lab_analysis_images.length : 0);
      }
      
      // Check if there are no lab analysis images and clear conclusion/recommendations if needed
      if (!inspection.lab_analysis_images || inspection.lab_analysis_images.length === 0) {
        console.log("🔍 DEBUG: No lab analysis images found, clearing conclusion and recommendations");
        
        // Only update database if there are conclusion/recommendations to clear (and not asbestos)
        if (currentInspectionType !== 'asbestos' && (inspection.lab_conclusion || inspection.lab_recommendations)) {
          console.log("🔍 DEBUG: Clearing lab_conclusion and lab_recommendations from database");
          
          // Use the appropriate entity to update
          const updateEntity = currentInspectionType === 'asbestos' ? AsbestosInspection : MoldInspection;
          await updateEntity.update(inspectionId, {
            lab_conclusion: "",
            lab_recommendations: ""
          });
          
          // Update local state to reflect the cleared fields
          inspection.lab_conclusion = "";
          inspection.lab_recommendations = "";
        }
      }
      
      setInspection(inspection);
      
      console.log("🔍 DEBUG: Loading samples for inspection ID:", inspectionId);
      const samplesData = await Sample.findMany({ inspection_id: inspectionId });
      console.log("🔍 DEBUG: Samples loaded:", samplesData);
      setSamples(samplesData || []);
    } catch (error) {
      console.error("❌ ERROR: Error loading inspection:", error);
      console.error("❌ ERROR: Error details:", error.message);
      console.error("❌ ERROR: Error stack:", error.stack);
      setError("Failed to load inspection data");
    }
  };

  const handleLabImageUpload = async (event) => {
    // Skip Supabase session check - using Flask backend authentication
    // Auth is handled by the AuthContext and route guards

    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Store selected images for preview
    setSelectedLabImages(Array.from(files));

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
      console.log("🔍 DEBUG: Files to process:", files.length);
      console.log("🔍 DEBUG: Inspection type:", inspectionType);
      
      // For asbestos inspections, only upload images without OCR processing
      if (inspectionType === 'asbestos') {
        console.log("🔍 DEBUG: Asbestos inspection - skipping OCR processing");
        
        // Upload files without OCR processing
        const uploadedFiles = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadProgress(((i + 1) / files.length) * 100);
          setUploadedCount(i + 1);
          
          try {
            console.log(`📤 UPLOAD: Uploading ${file.name} to lab-analysis/lab-analysis-images bucket...`);
            const uploadResult = await UploadLabAnalysisImage(file);
            
            if (uploadResult && uploadResult.file_url) {
              console.log(`✅ UPLOAD: Successfully uploaded ${file.name} to lab-analysis/lab-analysis-images bucket`);
              console.log(`🔗 UPLOAD: File URL: ${uploadResult.file_url}`);
              console.log(`📁 UPLOAD: File path: ${uploadResult.file_path}`);
              console.log(`🪣 UPLOAD: Bucket: ${uploadResult.bucket}`);
              uploadedFiles.push({
                filename: file.name,
                file_url: uploadResult.file_url,
                file_path: uploadResult.file_path,
                bucket: uploadResult.bucket
              });
            }
          } catch (error) {
            console.error(`❌ UPLOAD: Error uploading ${file.name}:`, error);
          }
        }
        
        // Save uploaded files to database without analysis
        if (uploadedFiles.length > 0) {
          const labImageUrls = uploadedFiles.map(file => file.file_url);
          
          console.log("🔍 DEBUG: About to save to AsbestosInspection table:");
          console.log("  - Table: asbestosinspection");
          console.log("  - Field: lab_analysis_images");
          console.log("  - Inspection ID:", inspectionId);
          console.log("  - Lab image URLs:", labImageUrls);
          
          await AsbestosInspection.update(inspectionId, {
            lab_analysis_images: labImageUrls
          });
          
          console.log(`✅ Asbestos lab images uploaded! ${uploadedFiles.length} files saved to asbestosinspection.lab_analysis_images`);
          console.log("📋 DATA FLOW: Upload → AsbestosInspection.update() → asbestosinspection.lab_analysis_images");
          
          // Reload data to see the updated images
          console.log("🔄 Reloading inspection data to reflect uploaded images...");
          loadInspectionData();
        }
        
        return; // Skip OCR processing for asbestos
      }
      
      // For mold inspections, continue with OCR processing
      // Step 1: Upload ALL files to lab-analysis bucket first
      const uploadedFiles = [];
      const processedFiles = [];
      const skippedFiles = [];
      let allExtractedText = "";
      
      console.log("🔍 STEP 1: Uploading all files to lab-analysis bucket...");
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress
        setUploadedCount(i + 1);
        setUploadProgress(((i + 1) / files.length) * 100);
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file: ${file.name}`);
          skippedFiles.push({ file: file.name, reason: 'Not an image file' });
          continue;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          console.warn(`File too large: ${file.name} (${file.size} bytes)`);
          skippedFiles.push({ file: file.name, reason: 'File too large (max 10MB)' });
          continue;
        }

        console.log(`🔍 DEBUG: Uploading file ${i + 1}/${files.length} to lab-analysis bucket: ${file.name}`);
        
        try {
          // Upload file to lab-analysis bucket
        const uploadResult = await UploadLabAnalysisImage(file);
        console.log("🔍 DEBUG: Upload result:", uploadResult);
        
          if (uploadResult && uploadResult.file_url) {
            console.log(`✅ UPLOAD: Successfully uploaded ${file.name} to lab-analysis bucket`);
            uploadedFiles.push({
              filename: file.name,
              file_url: uploadResult.file_url,
              file_path: uploadResult.file_path,
              bucket: uploadResult.bucket
            });
            
            // Step 2: Process uploaded file with OCR
            console.log(`📡 OCR: Making Google Vision API call for uploaded file: ${file.name}`);
            const ocrResult = await ProcessLabImageWithOCR(file);
            console.log("🔍 DEBUG: OCR processing result:", ocrResult);
            
            if (ocrResult && ocrResult.valid && ocrResult.extracted_text) {
              console.log(`✅ OCR: Google Vision API successfully processed ${file.name}, extracted ${ocrResult.extracted_text.length} characters`);
              // Apply auto-filters to remove noisy lines
              const filteredText = applyAutoFilters(ocrResult.extracted_text);
              processedFiles.push({
                filename: file.name,
                file_url: uploadResult.file_url,
                extracted_text: filteredText,
                confidence: ocrResult.confidence
              });
              
              // Combine all extracted text for analysis
              allExtractedText += `\n\n=== ${file.name} ===\n${filteredText}`;
              
            } else {
              const errorMessage = ocrResult?.message || ocrResult?.error || 'Unknown OCR error';
              console.warn(`❌ OCR: Google Vision API failed for ${file.name}:`, errorMessage);
              skippedFiles.push({ 
                file: file.name, 
                reason: `Google Vision API failed: ${errorMessage}` 
              });
            }
          } else {
            console.error(`❌ UPLOAD: Failed to upload ${file.name} to lab-analysis bucket`);
            skippedFiles.push({ 
              file: file.name, 
              reason: 'Upload to lab-analysis bucket failed' 
            });
          }
        } catch (error) {
          console.error(`❌ Error processing ${file.name}:`, error);
          skippedFiles.push({ 
            file: file.name, 
            reason: `Processing error: ${error.message}` 
          });
        }
      }
      
      // Show processing summary
      if (skippedFiles.length > 0) {
        const skippedMessage = skippedFiles.map(f => `• ${f.file}: ${f.reason}`).join('\n');
        console.warn("⚠️ Some files were skipped:", skippedFiles);
        alert(`${skippedFiles.length} file(s) were skipped:\n\n${skippedMessage}\n\n${processedFiles.length} file(s) were processed with OCR.`);
      }
      
      if (processedFiles.length === 0) {
        throw new Error('No files could be processed with OCR. No analysis will be generated.');
      }
      
      console.log(`✅ UPLOAD & OCR PROCESSING: ${processedFiles.length} out of ${files.length} files processed successfully`);
      
      // Clean the extracted text to filter only mold-related content
      let cleanedExtractedText = cleanExtractedText(allExtractedText);
      console.log("🔍 DEBUG: Original extracted text length:", allExtractedText.length);
      console.log("🔍 DEBUG: Cleaned extracted text length:", cleanedExtractedText.length);
      console.log("🔍 DEBUG: Cleaned extracted text:", cleanedExtractedText);
      // Remove any template/instructional lines from the cleanedExtractedText
      const instructionKeywords = [
        "please analyze", "conclusion", "recommendations", "return your response", "make the analysis", "- summarize", "- assess", "- evaluate", "- compare", "- consider", "- immediate actions", "- preventive measures", "- professional services", "- timeline", "- environmental controls", "- follow-up testing"
      ];
      cleanedExtractedText = cleanedExtractedText
        .split('\n')
        .filter(line => {
          const lower = line.toLowerCase();
          return !instructionKeywords.some(keyword => lower.includes(keyword));
        })
        .join('\n');
      
      // Step 3: Generate analysis from cleaned extracted text
      console.log("🔍 STEP 3: Generating analysis from cleaned extracted text...");
      
      try {
        // Construct comprehensive prompt with all inspection data
        const propertyDetailsSection = `**Property Details:**
Address: ${inspection.street_address || 'Not specified'}, ${inspection.city || 'Not specified'}, ${inspection.state || 'Not specified'} ${inspection.zip_code || 'Not specified'}
Property Type: ${inspection.property_type || 'Not specified'}
Square Footage: ${inspection.square_footage || 'Not specified'}
Year Built: ${inspection.year_built || 'Not specified'}

`;
        
        // Parse mold locations for detailed findings
        let moldLocations = [];
        try {
          if (inspection.mold_locations && typeof inspection.mold_locations === 'string') {
            moldLocations = JSON.parse(inspection.mold_locations);
          } else if (Array.isArray(inspection.mold_locations)) {
            moldLocations = inspection.mold_locations;
          }
        } catch (e) {
          console.error("Error parsing mold_locations:", e);
        }

        // Parse water damage locations
        let waterDamageLocations = [];
        try {
          if (inspection.water_damage_locations && typeof inspection.water_damage_locations === 'string') {
            waterDamageLocations = JSON.parse(inspection.water_damage_locations);
          } else if (Array.isArray(inspection.water_damage_locations)) {
            waterDamageLocations = inspection.water_damage_locations;
          }
        } catch (e) {
          console.error("Error parsing water_damage_locations:", e);
        }

        const clientInfoSection = `**Client Information:**
Client Type: ${inspection.client_type || 'Not specified'}

`;

        const visibleMoldSection = `**Visible Mold Findings:**
Visible Mold Present: ${inspection.has_visible_mold ? 'Yes' : 'No'}
${inspection.has_visible_mold && moldLocations.length > 0 ? 
  'Visible Mold Details:\n' + moldLocations.map((location, i) => `  - Location ${i + 1}: ${location || 'N/A'}`).join('\n') + '\n' 
  : 'No visible mold was reported during this inspection.\n'}
`;

        const waterDamageSection = `**Water Damage History:**
Recent Water Damage: ${inspection.has_water_damage ? 'Yes' : 'No'}
${inspection.has_water_damage && waterDamageLocations.length > 0 ? 
  'Water Damage Details:\n' + waterDamageLocations.map((location, i) => `  - Location ${i + 1}: ${location || 'N/A'}`).join('\n') + '\n'
  : 'No recent water damage was reported during this inspection.\n'}
`;

        const environmentalSection = `**Environmental Conditions:**
Temperature: ${inspection.temperature || 'Not recorded'}°F
Humidity: ${inspection.humidity || 'Not recorded'}%
Data Collection Method: ${inspection.environmental_data_method || 'Not specified'}

`;

        const samplesSection = samples && samples.length > 0 ? 
          `**Samples Collected:**
${samples.map((sample, i) => `Sample ${i + 1}: Location: ${sample.location || 'Not specified'}, Description: ${sample.description || 'Not specified'}`).join('\n')}

` : '**Samples Collected:**\nNo samples were collected during this inspection.\n\n';

        const labAnalysisSection = `**Lab Analysis Results:**
${cleanedExtractedText || 'No lab analysis results available.'}

`;

        const instructions = inspectionType === 'asbestos' 
          ? `You are an expert asbestos inspection and assessment consultant. Your task is to analyze the provided asbestos inspection data and lab analysis results to generate a concise conclusion and actionable recommendations for the property owner. Structure the output as a JSON object with two keys: conclusion (string) and recommendations (string).

IMPORTANT FORMATTING REQUIREMENTS:
- Do NOT use asterisks (*) for formatting or emphasis
- Do NOT use numbered lists (1. 2. 3.) for recommendations
- Use plain text without markdown formatting
- For recommendations, use section headers followed by colon (like "Immediate Actions Needed:" "Preventive Measures:" etc.)
- Use clear, professional language without special characters for emphasis

Based on the comprehensive inspection data above, provide a professional conclusion and specific recommendations. Consider:
- Types of asbestos materials identified and their condition
- Whether asbestos levels are concerning based on industry standards
- Property context and building age
- Health and safety implications
- Risk assessment for renovation or demolition
- Presence of friable vs. non-friable asbestos

Return your response in this exact JSON format:
{
  "conclusion": "Your detailed conclusion here (2-3 paragraphs summarizing findings, health implications, and overall assessment)...",
  "recommendations": "Your detailed recommendations here with section headers like 'Immediate Actions Needed: [details]' 'Preventive Measures: [details]' 'Professional Services Recommended: [details]' 'Timeline for Required Actions: [details]' 'Risk Management Strategies: [details]'"
}`
          : `You are an expert mold inspection and remediation consultant. Your task is to analyze the provided mold inspection data and lab analysis results to generate a concise conclusion and actionable recommendations for the property owner. Structure the output as a JSON object with two keys: conclusion (string) and recommendations (string).

IMPORTANT FORMATTING REQUIREMENTS:
- Do NOT use asterisks (*) for formatting or emphasis
- Do NOT use numbered lists (1. 2. 3.) for recommendations
- Use plain text without markdown formatting
- For recommendations, use section headers followed by colon (like "Immediate Actions Needed:" "Preventive Measures:" etc.)
- Use clear, professional language without special characters for emphasis

Based on the comprehensive inspection data above, provide a professional conclusion and specific recommendations. Consider:
- Types of mold identified and concentration levels
- Whether levels are elevated or concerning based on industry standards
- Property context and environmental conditions
- Health and safety implications
- Comparison to outdoor levels and normal ranges
- Presence of toxigenic molds

Return your response in this exact JSON format:
{
  "conclusion": "Your detailed conclusion here (2-3 paragraphs summarizing findings, health implications, and overall assessment)...",
  "recommendations": "Your detailed recommendations here with section headers like 'Immediate Actions Needed: [details]' 'Preventive Measures: [details]' 'Professional Services Recommended: [details]' 'Timeline for Required Actions: [details]' 'Environmental Controls to Implement: [details]'"
}`;

        const analysisPrompt = propertyDetailsSection + clientInfoSection + visibleMoldSection + waterDamageSection + environmentalSection + samplesSection + labAnalysisSection + instructions;

        // Send the constructed prompt as the 'prompt' field to the backend
        const analysisResult = await Core.InvokeLLM(analysisPrompt);

        console.log("✅ OCR ANALYSIS: Received analysis from backend!");
        console.log("🔍 DEBUG: Analysis result:", analysisResult);
      
        // Parse the response to extract conclusion and use standard template for recommendations
        let conclusion = "";
        let recommendations = inspectionType === 'asbestos' 
          ? `<strong>Immediate Actions</strong>
1. Avoid Disturbance
Do not disturb any suspected asbestos-containing materials. Asbestos fibers become airborne when materials are damaged or disturbed.

2. Limit Access
Restrict access to areas where asbestos materials are suspected, especially for children and individuals with respiratory conditions.

<strong>Next Steps</strong>
1. Consult an Asbestos Professional
Hire a certified asbestos inspector to conduct a thorough assessment and testing of suspected materials.

2. Professional Testing
Schedule professional asbestos testing to confirm the presence and type of asbestos materials.

<strong>Risk Management</strong>
• Document Conditions
Take photographs and document the current condition of suspected asbestos materials.

• Monitor for Damage
Regularly inspect for signs of deterioration, water damage, or other conditions that could release asbestos fibers.

• Plan for Renovation
If renovation or demolition is planned, asbestos abatement must be completed by licensed professionals before work begins.

• Emergency Procedures
Have a plan for handling accidental disturbance of asbestos materials, including evacuation and professional cleanup.`
          : `<strong>Immediate Actions</strong>
1. Fix Moisture & Humidity Issues
Address any leaks, water intrusion, or ventilation problems as soon as possible. Mold thrives in damp conditions, eliminating the source is the first step toward resolution.

2. Avoid Impacted Areas
Until the issue is resolved, limit access to areas where mold may be present, especially for individuals with allergies, asthma, or weakened immune systems.

<strong>Next Steps</strong>
1. Consult a Mold Professional
To fully understand the extent of the issue, we recommend hiring a certified mold professional. They can perform an on-site inspection, identify hidden growth, and provide a detailed remediation plan tailored to your situation.

2. Re-Testing
After resolving moisture issues and completing cleanup or remediation, re-testing can verify that mold levels are back to normal and your environment is safe.

<strong>Prevention Tips</strong>
• Act Quickly on Leaks
Whether from pipes, AC units, or roofing, repair leaks immediately to prevent moisture buildup.

• Monitor Humidity
Aim to keep indoor humidity below 50%. Use dehumidifiers or exit fans as needed, especially in bathrooms, kitchens, and basements.

• Look for Early Signs
Watch for discoloration, musty odors, or spots on ceilings and walls, these may indicate hidden issues.

• Promote Airflow
Open windows when weather allows, use ceiling fans, and keep vents unobstructed to maintain proper circulation.

• Inspect After Water Events
After flooding or water damage, inspect and dry affected areas promptly, and consider testing again if you're unsure.`;

        // Parse AI conclusion but use standard recommendations
        if (analysisResult.conclusion) {
          conclusion = analysisResult.conclusion;
        } else if (typeof analysisResult.content === 'string') {
          if (analysisResult.content.trim().startsWith('{')) {
            try {
              const parsedResult = JSON.parse(analysisResult.content);
              conclusion = parsedResult.conclusion || "Lab analysis completed successfully.";
            } catch (parseError) {
              // Extract conclusion from content
              const contentSplit = analysisResult.content.split(/\*\*RECOMMENDATIONS\*\*|Recommendations:|RECOMMENDATIONS:|"recommendations":\s*"/i);
              if (contentSplit.length > 1) {
                conclusion = contentSplit[0].replace(/\*\*CONCLUSION\*\*|Conclusion:|CONCLUSION:|"conclusion":\s*"/i, '').trim();
              } else {
                conclusion = analysisResult.content;
              }
            }
          } else {
            // Extract conclusion from non-JSON content
            const split = analysisResult.content.split(/\*\*RECOMMENDATIONS\*\*|Recommendations:|RECOMMENDATIONS:/i);
            if (split.length > 1) {
              conclusion = split[0].replace(/\*\*CONCLUSION\*\*|Conclusion:|CONCLUSION:/i, '').trim();
            } else {
              conclusion = analysisResult.content;
            }
          }
        } else {
          conclusion = "Lab analysis completed successfully.";
        }

        // Clean up conclusion formatting
        conclusion = conclusion
          .replace(/\*\*/g, '') // Remove bold asterisks
          .replace(/\*/g, '') // Remove single asterisks
          .replace(/^\s*["']*/, '') // Remove leading quotes
          .replace(/["']*\s*$/, '') // Remove trailing quotes
          .trim();

        // Update local state immediately so the textareas show the response
        setInspection(prev => ({
          ...prev,
          lab_conclusion: conclusion,
          lab_recommendations: recommendations
        }));

        // Save lab images URLs and report content to the database
        const labImageUrls = uploadedFiles.map(file => file.file_url);
        
        // Use the appropriate entity to update
        const updateEntity = inspectionType === 'asbestos' ? AsbestosInspection : MoldInspection;
        const updateData = { lab_analysis_images: labImageUrls };
        
        // Only add conclusion/recommendations for mold inspections
        if (inspectionType !== 'asbestos') {
          updateData.lab_conclusion = conclusion;
          updateData.lab_recommendations = recommendations;
        }
        
        await updateEntity.update(inspectionId, updateData);
        
        console.log(`✅ ${inspectionType === 'asbestos' ? 'Asbestos' : 'Lab'} analysis complete! Lab images uploaded to bucket and analysis saved to database.`);
        
      } catch (analysisError) {
        console.error("❌ OCR ANALYSIS: Error during analysis generation:", analysisError);
        throw new Error(`Failed to generate ${inspectionType === 'asbestos' ? 'asbestos' : 'lab'} analysis from OCR text: ${analysisError.message}`);
      }
      
      // Show success message
      const totalProcessed = files.length;
      const totalSuccessful = processedFiles.length;
      const totalSkipped = skippedFiles.length;
      
    } catch (error) {
      console.error("❌ Error in lab image upload process:", error);
      alert(`Failed to upload ${inspectionType === 'asbestos' ? 'asbestos lab analysis' : 'lab analysis'} images: ${error.message}`);
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
      console.log("🔍 DEBUG: Generating analysis for image:", imageUrl);
    console.log("🔍 DEBUG: Inspection ID:", inspectionId);
      
      // Parse mold locations for detailed findings
      let moldLocations = [];
      try {
        if (inspection.mold_locations && typeof inspection.mold_locations === 'string') {
          moldLocations = JSON.parse(inspection.mold_locations);
        } else if (Array.isArray(inspection.mold_locations)) {
          moldLocations = inspection.mold_locations;
        }
      } catch (e) {
        console.error("Error parsing mold_locations:", e);
      }

      // Parse water damage locations
      let waterDamageLocations = [];
      try {
        if (inspection.water_damage_locations && typeof inspection.water_damage_locations === 'string') {
          waterDamageLocations = JSON.parse(inspection.water_damage_locations);
        } else if (Array.isArray(inspection.water_damage_locations)) {
          waterDamageLocations = inspection.water_damage_locations;
        }
      } catch (e) {
        console.error("Error parsing water_damage_locations:", e);
      }

      // Construct comprehensive prompt with inspection context
      let comprehensivePrompt = '';
      
      if (inspectionType === 'asbestos') {
        comprehensivePrompt = `You are an expert asbestos inspection and assessment consultant. Your task is to analyze the provided asbestos inspection data and lab analysis results to generate a concise conclusion and actionable recommendations for the property owner. Structure the output as a JSON object with two keys: conclusion (string) and recommendations (string).

IMPORTANT FORMATTING REQUIREMENTS:
- Do NOT use asterisks (*) for formatting or emphasis
- Do NOT use numbered lists (1. 2. 3.) for recommendations
- Use plain text without markdown formatting
- For recommendations, use section headers followed by colon (like "Immediate Actions Needed:" "Preventive Measures:" etc.)
- Use clear, professional language without special characters for emphasis

**Property Details:**
Address: ${inspection.street_address || 'Not specified'}, ${inspection.city || 'Not specified'}, ${inspection.state || 'Not specified'} ${inspection.zip_code || 'Not specified'}
Property Type: ${inspection.property_type || 'Not specified'}
Square Footage: ${inspection.square_footage || 'Not specified'}
Year Built: ${inspection.year_built || 'Not specified'}

**Client Information:**
Client Type: ${inspection.client_type || 'Not specified'}

**Building Age Assessment:**
Year Built: ${inspection.year_built || 'Not specified'}
${inspection.year_built && parseInt(inspection.year_built) < 1980 ? '⚠️ HIGH RISK: Property built before 1980 has higher likelihood of containing asbestos materials.\n' : 'Property built after 1980 has lower asbestos risk.\n'}

**Environmental Conditions:**
Temperature: ${inspection.temperature || 'Not recorded'}°F
Humidity: ${inspection.humidity || 'Not recorded'}%
Data Collection Method: ${inspection.environmental_data_method || 'Not specified'}

**Samples Collected:**
${samples && samples.length > 0 ? 
  samples.map((sample, i) => `Sample ${i + 1}: Location: ${sample.location || 'Not specified'}, Description: ${sample.description || 'Not specified'}`).join('\n')
  : 'No samples were collected during this inspection.'}

**Lab Analysis Results (extracted from image at ${imageUrl}):**
Please analyze the lab analysis image provided and extract relevant information about:
- Types of asbestos materials identified (e.g., chrysotile, amosite, crocidolite)
- Condition of materials (friable vs. non-friable)
- Whether levels are concerning based on industry standards
- Risk assessment for renovation or demolition

Based on this comprehensive information, provide a conclusion and specific recommendations. Consider all contextual factors including property details, building age, environmental conditions, and lab results.

Return your response in this exact JSON format:
{
  "conclusion": "Your detailed conclusion here (2-3 paragraphs summarizing findings, health implications, and overall assessment)...",
  "recommendations": "Your detailed recommendations here with section headers like 'Immediate Actions Needed: [details]' 'Preventive Measures: [details]' 'Professional Services Recommended: [details]' 'Timeline for Required Actions: [details]' 'Risk Management Strategies: [details]'"
}`;
      } else {
        comprehensivePrompt = `You are an expert mold inspection and remediation consultant. Your task is to analyze the provided mold inspection data and lab analysis results to generate a concise conclusion and actionable recommendations for the property owner. Structure the output as a JSON object with two keys: conclusion (string) and recommendations (string).

IMPORTANT FORMATTING REQUIREMENTS:
- Do NOT use asterisks (*) for formatting or emphasis
- Do NOT use numbered lists (1. 2. 3.) for recommendations
- Use plain text without markdown formatting
- For recommendations, use section headers followed by colon (like "Immediate Actions Needed:" "Preventive Measures:" etc.)
- Use clear, professional language without special characters for emphasis

**Property Details:**
Address: ${inspection.street_address || 'Not specified'}, ${inspection.city || 'Not specified'}, ${inspection.state || 'Not specified'} ${inspection.zip_code || 'Not specified'}
Property Type: ${inspection.property_type || 'Not specified'}
Square Footage: ${inspection.square_footage || 'Not specified'}
Year Built: ${inspection.year_built || 'Not specified'}

**Client Information:**
Client Type: ${inspection.client_type || 'Not specified'}

**Visible Mold Findings:**
Visible Mold Present: ${inspection.has_visible_mold ? 'Yes' : 'No'}
${inspection.has_visible_mold && moldLocations.length > 0 ? 
  'Visible Mold Details:\n' + moldLocations.map((location, i) => `  - Location ${i + 1}: ${location || 'N/A'}`).join('\n') + '\n' 
  : 'No visible mold was reported during this inspection.\n'}

**Water Damage History:**
Recent Water Damage: ${inspection.has_water_damage ? 'Yes' : 'No'}
${inspection.has_water_damage && waterDamageLocations.length > 0 ? 
  'Water Damage Details:\n' + waterDamageLocations.map((location, i) => `  - Location ${i + 1}: ${location || 'N/A'}`).join('\n') + '\n'
  : 'No recent water damage was reported during this inspection.\n'}

**Environmental Conditions:**
Temperature: ${inspection.temperature || 'Not recorded'}°F
Humidity: ${inspection.humidity || 'Not recorded'}%
Data Collection Method: ${inspection.environmental_data_method || 'Not specified'}

**Samples Collected:**
${samples && samples.length > 0 ? 
  samples.map((sample, i) => `Sample ${i + 1}: Location: ${sample.location || 'Not specified'}, Description: ${sample.description || 'Not specified'}`).join('\n')
  : 'No samples were collected during this inspection.'}

**Lab Analysis Results (extracted from image at ${imageUrl}):**
Please analyze the lab analysis image provided and extract relevant information about:
- Types of mold identified (e.g., Stachybotrys, Aspergillus/Penicillium, Cladosporium)
- Concentration levels (e.g., spore counts per cubic meter, colony forming units)
- Whether levels are elevated or concerning based on industry standards
- Presence of toxigenic molds

Based on this comprehensive information, provide a conclusion and specific recommendations. Consider all contextual factors including property details, environmental conditions, visible findings, and lab results.

Return your response in this exact JSON format:
{
  "conclusion": "Your detailed conclusion here (2-3 paragraphs summarizing findings, health implications, and overall assessment)...",
  "recommendations": "Your detailed recommendations here with section headers like 'Immediate Actions Needed: [details]' 'Preventive Measures: [details]' 'Professional Services Recommended: [details]' 'Timeline for Required Actions: [details]' 'Environmental Controls to Implement: [details]'"
}`;
      }
      
      // Use the InvokeLLM function to analyze the image with comprehensive context
      const analysisResult = await InvokeLLM({
        prompt: comprehensivePrompt,
        image_url: imageUrl
      }, [], inspectionId);
      
      console.log("🔍 DEBUG: Analysis result:", analysisResult);
      
      if (analysisResult) {
        // Parse AI conclusion but use standard recommendations template
        let conclusion = "";
        let recommendations = inspectionType === 'asbestos' 
          ? `<strong>Immediate Actions</strong>
1. Avoid Disturbance
Do not disturb any suspected asbestos-containing materials. Asbestos fibers become airborne when materials are damaged or disturbed.

2. Limit Access
Restrict access to areas where asbestos materials are suspected, especially for children and individuals with respiratory conditions.

<strong>Next Steps</strong>
1. Consult an Asbestos Professional
Hire a certified asbestos inspector to conduct a thorough assessment and testing of suspected materials.

2. Professional Testing
Schedule professional asbestos testing to confirm the presence and type of asbestos materials.

<strong>Risk Management</strong>
• Document Conditions
Take photographs and document the current condition of suspected asbestos materials.

• Monitor for Damage
Regularly inspect for signs of deterioration, water damage, or other conditions that could release asbestos fibers.

• Plan for Renovation
If renovation or demolition is planned, asbestos abatement must be completed by licensed professionals before work begins.

• Emergency Procedures
Have a plan for handling accidental disturbance of asbestos materials, including evacuation and professional cleanup.`
          : `<strong>Immediate Actions</strong>
1. Fix Moisture & Humidity Issues
Address any leaks, water intrusion, or ventilation problems as soon as possible. Mold thrives in damp conditions, eliminating the source is the first step toward resolution.

2. Avoid Impacted Areas
Until the issue is resolved, limit access to areas where mold may be present, especially for individuals with allergies, asthma, or weakened immune systems.

<strong>Next Steps</strong>
1. Consult a Mold Professional
To fully understand the extent of the issue, we recommend hiring a certified mold professional. They can perform an on-site inspection, identify hidden growth, and provide a detailed remediation plan tailored to your situation.

2. Re-Testing
After resolving moisture issues and completing cleanup or remediation, re-testing can verify that mold levels are back to normal and your environment is safe.

<strong>Prevention Tips</strong>
• Act Quickly on Leaks
Whether from pipes, AC units, or roofing, repair leaks immediately to prevent moisture buildup.

• Monitor Humidity
Aim to keep indoor humidity below 50%. Use dehumidifiers or exhaust fans as needed, especially in bathrooms, kitchens, and basements.

• Look for Early Signs
Watch for discoloration, musty odors, or spots on ceilings and walls, these may indicate hidden issues.

• Promote Airflow
Open windows when weather allows, use ceiling fans, and keep vents unobstructed to maintain proper circulation.

• Inspect After Water Events
After flooding or water damage, inspect and dry affected areas promptly, and consider testing again if you're unsure.`;

        // Parse AI conclusion but use standard recommendations
        if (analysisResult.conclusion) {
          conclusion = analysisResult.conclusion;
        } else if (typeof analysisResult.content === 'string') {
          if (analysisResult.content.trim().startsWith('{')) {
            try {
              const parsedResult = JSON.parse(analysisResult.content);
              conclusion = parsedResult.conclusion || "Lab analysis completed successfully.";
            } catch (parseError) {
              // Extract conclusion from content
              const contentSplit = analysisResult.content.split(/\*\*RECOMMENDATIONS\*\*|Recommendations:|RECOMMENDATIONS:|"recommendations":\s*"/i);
              if (contentSplit.length > 1) {
                conclusion = contentSplit[0].replace(/\*\*CONCLUSION\*\*|Conclusion:|CONCLUSION:|"conclusion":\s*"/i, '').trim();
              } else {
                conclusion = analysisResult.content;
              }
            }
          } else {
            // Extract conclusion from non-JSON content
            const split = analysisResult.content.split(/\*\*RECOMMENDATIONS\*\*|Recommendations:|RECOMMENDATIONS:/i);
            if (split.length > 1) {
              conclusion = split[0].replace(/\*\*CONCLUSION\*\*|Conclusion:|CONCLUSION:/i, '').trim();
            } else {
              conclusion = analysisResult.content;
            }
          }
        } else if (typeof analysisResult === 'string') {
          if (analysisResult.trim().startsWith('{')) {
            try {
              const parsedResult = JSON.parse(analysisResult);
              conclusion = parsedResult.conclusion || analysisResult;
            } catch (parseError) {
              conclusion = analysisResult;
            }
          } else {
            // Extract conclusion from non-JSON content
            const split = analysisResult.split(/\*\*RECOMMENDATIONS\*\*|Recommendations:|RECOMMENDATIONS:/i);
            if (split.length > 1) {
              conclusion = split[0].replace(/\*\*CONCLUSION\*\*|Conclusion:|CONCLUSION:/i, '').trim();
            } else {
              conclusion = analysisResult;
            }
          }
        } else {
          conclusion = "Lab analysis completed successfully.";
        }

        // Clean up conclusion formatting
        conclusion = conclusion
          .replace(/\*\*/g, '') // Remove bold asterisks
          .replace(/\*/g, '') // Remove single asterisks
          .replace(/^\s*["']*/, '') // Remove leading quotes
          .replace(/["']*\s*$/, '') // Remove trailing quotes
          .trim();

        // Update the inspection with the standard template
        setInspection(prev => ({
          ...prev,
          lab_conclusion: conclusion,
          lab_recommendations: recommendations
        }));

        // Also save to database (only for mold inspections)
        if (inspectionType !== 'asbestos') {
          const updateEntity = inspectionType === 'asbestos' ? AsbestosInspection : MoldInspection;
          await updateEntity.update(inspectionId, {
            lab_conclusion: conclusion,
            lab_recommendations: recommendations
          });
        }
        
        console.log("🔍 DEBUG: Updated inspection with separated conclusion and recommendations");
        console.log("🔍 DEBUG: Conclusion:", conclusion);
        console.log("🔍 DEBUG: Recommendations:", recommendations);
      }
    } catch (error) {
      console.error("❌ Error generating analysis:", error);
      alert(`Failed to generate ${inspectionType === 'asbestos' ? 'asbestos' : 'lab'} analysis. Please try again.`);
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

      if (!inspectionType) {
        throw new Error('Inspection type not determined');
      }

      console.log("🔍 DEBUG: Saving changes for inspection ID:", inspectionId);
      console.log("🔍 DEBUG: Inspection Type:", inspectionType);
      console.log("🔍 DEBUG: Lab Conclusion:", inspection.lab_conclusion);
      console.log("🔍 DEBUG: Lab Recommendations:", inspection.lab_recommendations);

      // Use the appropriate entity to save changes (only for mold inspections)
      if (inspectionType !== 'asbestos') {
        const updateEntity = inspectionType === 'asbestos' ? AsbestosInspection : MoldInspection;
        
        // Save the lab analysis changes
        await updateEntity.update(inspectionId, {
          lab_conclusion: inspection.lab_conclusion,
          lab_recommendations: inspection.lab_recommendations
        });
      }

      console.log("🔍 DEBUG: Changes saved successfully");
      alert(inspectionType === 'asbestos' 
        ? "Asbestos assessment changes saved successfully!"
        : "Changes saved successfully! The report will include the updated lab analysis when downloaded."
      );
      
    } catch (error) {
      console.error("❌ Error saving:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMaterials = async () => {
    setSaving(true);
    try {
      if (!inspectionId || !inspection || !inspectionType) {
        throw new Error('Missing required data for saving materials');
      }

      if (inspectionType !== 'asbestos') {
        throw new Error('Material editing is only available for asbestos inspections');
      }

      // Validate material type
      let finalMaterialType = editingMaterialType;
      if (editingMaterialType === 'other') {
        if (!customMaterialType.trim()) {
          alert("Please specify the custom material type");
          return;
        }
        finalMaterialType = customMaterialType.trim();
      } else if (!editingMaterialType.trim()) {
        alert("Please select a material type");
        return;
      }

      // Validate material condition
      if (!editingMaterialCondition) {
        alert("Please select a material condition");
        return;
      }

      console.log("🔍 DEBUG: Saving material changes for asbestos inspection ID:", inspectionId);
      console.log("🔍 DEBUG: Material Type:", finalMaterialType);
      console.log("🔍 DEBUG: Material Condition:", editingMaterialCondition);

      // Update the asbestos inspection with new material data
      await AsbestosInspection.update(inspectionId, {
        material_type: finalMaterialType,
        material_condition: editingMaterialCondition,
        material_images: inspection.material_images || []
      });

      // Update local state
      setInspection(prev => ({
        ...prev,
        material_type: finalMaterialType,
        material_condition: editingMaterialCondition
      }));

      console.log("🔍 DEBUG: Material changes saved successfully");
      setIsEditingMaterials(false);
      alert("Material assessment updated successfully!");
      
    } catch (error) {
      console.error("❌ Error saving materials:", error);
      alert("Failed to save material changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditMaterials = () => {
    const materialType = inspection.material_type || '';
    setEditingMaterialType(materialType);
    
    // Check if the material type is not in our predefined list
    const predefinedTypes = ['roofing', 'insulation', 'flooring', 'ceiling_tiles', 'wallboard', 'textured_coatings', 'pipe_insulation', 'duct_insulation', 'fireproofing'];
    if (materialType && !predefinedTypes.includes(materialType)) {
      setEditingMaterialType('other');
      setCustomMaterialType(materialType);
    } else {
      setCustomMaterialType('');
    }
    
    setEditingMaterialCondition(inspection.material_condition || '');
    setIsEditingMaterials(true);
  };

  const handleCancelEditMaterials = () => {
    setIsEditingMaterials(false);
    setEditingMaterialType('');
    setEditingMaterialCondition('');
    setCustomMaterialType('');
  };

  const handleMaterialImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploadedUrls = [];
      
      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file: ${file.name}`);
          continue;
        }
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          console.warn(`Skipping large file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
          continue;
        }
        
        // Create a unique filename
        const timestamp = Date.now();
        const filename = `material_${inspectionId}_${timestamp}_${file.name}`;
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('mold.images')
          .upload(`uploads/${filename}`, file);
        
        if (error) {
          console.error(`Error uploading ${file.name}:`, error);
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('mold.images')
          .getPublicUrl(`uploads/${filename}`);
        
        uploadedUrls.push(publicUrl);
      }
      
      if (uploadedUrls.length === 0) {
        alert("No images were successfully uploaded. Please check file types and sizes.");
        return;
      }
      
      // Update the inspection with new material images
      const currentImages = inspection.material_images || [];
      const newImages = [...currentImages, ...uploadedUrls];
      
      await AsbestosInspection.update(inspectionId, {
        material_images: newImages
      });
      
      // Update local state
      setInspection(prev => ({
        ...prev,
        material_images: newImages
      }));
      
      alert(`Successfully uploaded ${uploadedUrls.length} material image(s)`);
      
    } catch (error) {
      console.error("❌ Error uploading material images:", error);
      alert("Failed to upload material images. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveMaterialImage = async (imageIndex) => {
    if (!confirm('Are you sure you want to remove this material image?')) return;
    
    try {
      const currentImages = inspection.material_images || [];
      const newImages = currentImages.filter((_, index) => index !== imageIndex);
      
      await AsbestosInspection.update(inspectionId, {
        material_images: newImages
      });
      
      // Update local state
      setInspection(prev => ({
        ...prev,
        material_images: newImages
      }));
      
      alert('Material image removed successfully');
      
    } catch (error) {
      console.error("❌ Error removing material image:", error);
      alert("Failed to remove material image. Please try again.");
    }
  };

  const handleUpdateMaterialImages = async (newImages) => {
    try {
      await AsbestosInspection.update(inspectionId, {
        material_images: newImages
      });
      
      // Update local state
      setInspection(prev => ({
        ...prev,
        material_images: newImages
      }));
      
      console.log("🔍 DEBUG: Material images updated successfully");
      alert(`Successfully updated material images. ${newImages.length} image(s) now available.`);
      
    } catch (error) {
      console.error("❌ Error updating material images:", error);
      alert("Failed to update material images. Please try again.");
    }
  };

  const handleAddMaterialImageUrl = async () => {
    const url = prompt('Enter the URL of the material image:');
    if (!url || !url.trim()) return;
    
    try {
      const currentImages = inspection.material_images || [];
      const newImages = [...currentImages, url.trim()];
      
      await handleUpdateMaterialImages(newImages);
      
    } catch (error) {
      console.error("❌ Error adding material image URL:", error);
      alert("Failed to add material image URL. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-lg text-slate-600">Loading inspection details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 min-h-screen flex items-center justify-center">
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
      <div className="max-w-4xl mx-auto py-12 px-6 min-h-screen flex items-center justify-center">
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
              Submitted {format(new Date(inspection.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </p>
            {inspectionType && (
              <Badge className={`mt-2 px-3 py-1 text-sm ${
                inspectionType === 'mold' ? 'bg-blue-100 text-blue-800' :
                inspectionType === 'asbestos' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {inspectionType === 'mold' ? 'Mold Inspection' : 'Asbestos Inspection'}
              </Badge>
            )}
            
            {/* Material Type Badge for Asbestos Inspections */}
            {inspectionType === 'asbestos' && inspection.material_type && (
              <Badge className="mt-2 px-3 py-1 text-sm bg-orange-50 text-orange-700 border border-orange-200">
                Material: {inspection.material_type}
              </Badge>
            )}
            
            {/* Material Condition Badge for Asbestos Inspections */}
            {inspectionType === 'asbestos' && inspection.material_condition && (
              <Badge className={`mt-2 px-3 py-1 text-sm ${
                inspection.material_condition === 'Good' ? 'bg-green-100 text-green-700 border-green-200' :
                inspection.material_condition === 'Fair' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                inspection.material_condition === 'Poor' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                inspection.material_condition === 'Deteriorating' ? 'bg-red-100 text-red-700 border-red-200' :
                inspection.material_condition === 'Damaged' ? 'bg-red-100 text-red-700 border-red-200' :
                'bg-gray-100 text-gray-700 border-gray-200'
              } border`}>
                Condition: {inspection.material_condition}
              </Badge>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <Badge className={`px-3 py-1 text-sm ${
              inspection.status === 'completed' ? 'bg-green-100 text-green-800' :
              inspection.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {inspection.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

             <div className="grid gap-8 lg:grid-cols-2">
         {/* Left Column - Inspection Details */}
         <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </CardTitle>
              <CardDescription>
                Personal details and property information for this inspection
              </CardDescription>
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
                  <p className="font-medium">
                    {inspection.background_info}
                  </p>
                </div>
              )}

              {inspection.location_description && (
                <div>
                  <Label className="text-slate-600">Location Description</Label>
                  <p className="font-medium">
                    {inspection.location_description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

                     {/* Assessment Results */}
           <Card className={inspectionType === 'asbestos' ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50' : ''}>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <AlertTriangle className={`w-5 h-5 ${inspectionType === 'asbestos' ? 'text-orange-600' : ''}`} />
                 {inspectionType === 'asbestos' ? 'Asbestos Assessment Results & Findings' : 'Assessment Results & Findings'}
               </CardTitle>
               <CardDescription>
                 {inspectionType === 'asbestos' 
                   ? 'Comprehensive analysis of asbestos-related findings and conditions'
                   : 'Comprehensive analysis of visible mold, water damage, and environmental conditions'
                 }
               </CardDescription>
             </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Summary Overview */}
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg ${
                inspectionType === 'asbestos' 
                  ? 'bg-gradient-to-r from-orange-50 to-amber-50' 
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50'
              }`}>
                {inspectionType === 'mold' ? (
                  <>
                    <div className="text-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                        inspection.has_visible_mold && inspection.visible_mold_details && inspection.visible_mold_details.length > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">Visible Mold</p>
                      <Badge variant={inspection.mold_images && inspection.mold_images.length > 0 ? "destructive" : "secondary"} className="mt-1">
                        {inspection.mold_images && inspection.mold_images.length > 0 ? "Present" : "Not Detected"}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                        inspection.has_water_damage && inspection.water_damage_details && inspection.water_damage_details.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                      }`}>
                        <Droplets className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">Water Damage</p>
                      <Badge variant={inspection.water_damage_images && inspection.water_damage_images.length > 0 ? "default" : "secondary"} className="mt-1">
                        {inspection.water_damage_images && inspection.water_damage_images.length > 0 ? "Present" : "Not Detected"}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 bg-orange-100 text-orange-600">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">Asbestos Risk</p>
                      <Badge variant="outline" className="mt-1">
                        Assessment Required
                      </Badge>
                    </div>
                                         <div className="text-center">
                       <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 bg-blue-100 text-blue-600">
                         <Home className="w-6 h-6" />
                       </div>
                       <p className="text-sm font-medium text-slate-700">Property Age</p>
                       <Badge variant="outline" className="mt-1">
                         {inspection.year_built || 'Unknown'}
                       </Badge>
                     </div>
                     <div className="text-center">
                       <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 bg-purple-100 text-purple-600">
                         <AlertTriangle className="w-6 h-6" />
                       </div>
                       <p className="text-sm font-medium text-slate-700">Risk Level</p>
                       <Badge variant={inspection.year_built && parseInt(inspection.year_built) < 1980 ? "destructive" : "secondary"} className="mt-1">
                         {inspection.year_built && parseInt(inspection.year_built) < 1980 ? "High Risk" : "Low Risk"}
                       </Badge>
                     </div>
                     
                     {/* Material Overview for Asbestos */}
                     {inspection.material_type && (
                       <div className="text-center">
                         <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 bg-green-100 text-green-600">
                           <Database className="w-6 h-6" />
                         </div>
                         <p className="text-sm font-medium text-slate-700">Material Type</p>
                         <Badge variant="outline" className="mt-1">
                           {inspection.material_type}
                         </Badge>
                       </div>
                     )}
                     
                     {inspection.material_condition && (
                       <div className="text-center">
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                           inspection.material_condition === 'Good' ? 'bg-green-100 text-green-600' :
                           inspection.material_condition === 'Fair' ? 'bg-yellow-100 text-yellow-600' :
                           inspection.material_condition === 'Poor' ? 'bg-orange-100 text-orange-600' :
                           inspection.material_condition === 'Deteriorating' ? 'bg-red-100 text-red-600' :
                           inspection.material_condition === 'Damaged' ? 'bg-red-100 text-red-600' :
                           'bg-gray-100 text-gray-600'
                         }`}>
                           <AlertTriangle className="w-6 h-6" />
                         </div>
                         <p className="text-sm font-medium text-slate-700">Material Condition</p>
                         <Badge variant={inspection.material_condition === 'Good' ? "default" : 
                                       inspection.material_condition === 'Fair' ? "secondary" :
                                       inspection.material_condition === 'Poor' ? "destructive" :
                                       inspection.material_condition === 'Deteriorating' ? "destructive" :
                                       inspection.material_condition === 'Damaged' ? "destructive" : "secondary"} className="mt-1">
                           {inspection.material_condition}
                         </Badge>
                       </div>
                     )}
                  </>
                )}
                
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

              {/* Mold Images with Locations - Only for Mold Inspections */}
              {inspectionType === 'mold' && inspection.mold_images && inspection.mold_images.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <Label className="text-slate-700 font-semibold text-lg">Mold Images with Locations</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      // Parse mold_locations similar to AdminDashboard
                      let moldLocations = [];

                      try {
                        if (inspection.mold_locations && typeof inspection.mold_locations === 'string') {
                          moldLocations = JSON.parse(inspection.mold_locations);
                        } else if (Array.isArray(inspection.mold_locations)) {
                          moldLocations = inspection.mold_locations;
                        }
                      } catch (e) {
                        console.error("❌ Error parsing mold_locations:", e);
                      }
                      
                      return inspection.mold_images.map((image, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 p-4 rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                              <p className="font-semibold text-red-800">
                                Location: {(() => {
                                  try {
                                    if (inspection.mold_locations && typeof inspection.mold_locations === 'string') {
                                      const parsed = JSON.parse(inspection.mold_locations);
                                      return Array.isArray(parsed) ? parsed.join(', ') : parsed;
                                    } else if (Array.isArray(inspection.mold_locations)) {
                                      return inspection.mold_locations.join(', ');
                                    } else {
                                      return inspection.mold_locations || 'Unknown Location';
                                    }
                                  } catch (e) {
                                    return inspection.mold_locations || 'Unknown Location';
                                  }
                                })()}
                            </p>
                          </div>
                          <Badge variant="destructive" className="ml-2">High Priority</Badge>
                        </div>
                          <div className="relative group">
                              <img
                              src={image}
                              alt={`Mold image ${index + 1}`}
                              className="w-full h-32 object-cover rounded border-2 border-red-300"
                                />
                                <div className="absolute inset-0 bg-red-900 bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100">
                                    Mold Evidence
                                  </span>
                                </div>
                              </div>
                          </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Water Damage Images with Locations - Only for Mold Inspections */}
              {inspectionType === 'mold' && inspection.water_damage_images && inspection.water_damage_images.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <Label className="text-slate-700 font-semibold text-lg">Water Damage Images with Locations</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      // Parse mold_locations similar to AdminDashboard
                      let moldLocations = [];

                      try {
                        if (inspection.mold_locations && typeof inspection.mold_locations === 'string') {
                          moldLocations = JSON.parse(inspection.mold_locations);
                          } else if (Array.isArray(inspection.mold_locations)) {
                          moldLocations = inspection.mold_locations;
                        }
                      } catch (e) {
                        console.error("❌ Error parsing mold_locations:", e);
                      }
                      
                      return inspection.water_damage_images.map((image, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 p-4 rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                              <p className="font-semibold text-red-800">
                                Location: {(() => {
                                  try {
                                    if (inspection.water_damage_locations && typeof inspection.water_damage_locations === 'string') {
                                      const parsed = JSON.parse(inspection.water_damage_locations);
                                      return Array.isArray(parsed) ? parsed.join(', ') : parsed;
                                    } else if (Array.isArray(inspection.water_damage_locations)) {
                                      return inspection.water_damage_locations.join(', ');
                                    } else {
                                      return inspection.water_damage_locations || 'Unknown Location';
                                    }
                                  } catch (e) {
                                    return inspection.water_damage_locations || 'Unknown Location';
                                  }
                                })()}
                            </p>
                          </div>
                          <Badge variant="destructive" className="ml-2">Medium Priority</Badge>
                        </div>
                          <div className="relative group">
                              <img
                              src={image}
                              alt={`Water damage image ${index + 1}`}
                              className="w-full h-32 object-cover rounded border-2 border-red-300"
                                />
                                <div className="absolute inset-0 bg-red-900 bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100">
                                    Water Damage
                                  </span>
                                </div>
                              </div>
                          </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
              
              

              {/* Environmental Conditions - Only for Mold Inspections */}
              {inspectionType === 'mold' && (
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
              )}


                             {/* Recommendations */}
               <div className="space-y-3">
                 <div className="flex items-center gap-2">
                   <FileText className={`w-5 h-5 ${inspectionType === 'asbestos' ? 'text-orange-600' : 'text-green-600'}`} />
                   <Label className="text-slate-700 font-semibold text-lg">
                     {inspectionType === 'asbestos' ? 'Asbestos Assessment Recommendations' : 'Initial Recommendations'}
                   </Label>
                 </div>
                 
                 <div className={`p-4 rounded-lg space-y-2 ${
                   inspectionType === 'asbestos' 
                     ? 'bg-orange-50 border border-orange-200' 
                     : 'bg-green-50 border border-green-200'
                 }`}>
                  {inspectionType === 'mold' ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                                               <p className={`text-sm ${inspectionType === 'asbestos' ? 'text-orange-800' : 'text-green-800'}`}>
                         <strong>Professional Assessment Required:</strong> Asbestos inspection requires certified professional evaluation.
                       </p>
                     </div>
                     
                     {inspection.year_built && parseInt(inspection.year_built) < 1980 && (
                       <div className="flex items-start gap-2">
                         <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                         <p className={`text-sm ${inspectionType === 'asbestos' ? 'text-orange-800' : 'text-green-800'}`}>
                           <strong>High Risk Period:</strong> Property built before 1980 has higher likelihood of containing asbestos materials.
                         </p>
                       </div>
                     )}
                     
                                            <div className="flex items-start gap-2">
                         <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                         <p className={`text-sm ${inspectionType === 'asbestos' ? 'text-orange-800' : 'text-green-800'}`}>
                           <strong>Next Steps:</strong> Schedule professional asbestos inspection and testing if renovation or demolition is planned.
                         </p>
                       </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

                     {/* Asbestos-Specific Information - Only for Asbestos Inspections */}
           {inspectionType === 'asbestos' && (
             <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-orange-800">
                   <AlertTriangle className="w-5 h-5 text-orange-600" />
                   Asbestos Risk Assessment
                 </CardTitle>
                 <CardDescription className="text-orange-700">
                   Critical information for asbestos management and safety
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-white/50 p-4 rounded-lg border border-orange-200">
                     <h4 className="font-semibold text-orange-800 mb-2">Building Age Analysis</h4>
                     <div className="space-y-2">
                       <div className="flex justify-between">
                         <span className="text-slate-600">Year Built:</span>
                         <span className="font-medium">{inspection.year_built || 'Unknown'}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-slate-600">Risk Period:</span>
                         <span className={`font-medium ${inspection.year_built && parseInt(inspection.year_built) < 1980 ? 'text-red-600' : 'text-green-600'}`}>
                           {inspection.year_built && parseInt(inspection.year_built) < 1980 ? 'Pre-1980 (High Risk)' : 'Post-1980 (Low Risk)'}
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-slate-600">Asbestos Likelihood:</span>
                         <span className={`font-medium ${inspection.year_built && parseInt(inspection.year_built) < 1980 ? 'text-red-600' : 'text-green-600'}`}>
                           {inspection.year_built && parseInt(inspection.year_built) < 1980 ? 'High' : 'Low'}
                         </span>
                       </div>
                     </div>
                   </div>
                   
                   <div className="bg-white/50 p-4 rounded-lg border border-orange-200">
                     <h4 className="font-semibold text-orange-800 mb-2">Property Characteristics</h4>
                     <div className="space-y-2">
                       <div className="flex justify-between">
                         <span className="text-slate-600">Property Type:</span>
                         <span className="font-medium capitalize">{inspection.property_type?.replace('_', ' ') || 'Unknown'}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-slate-600">Square Footage:</span>
                         <span className="font-medium">{inspection.square_footage || 'Unknown'} sq ft</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-slate-600">Client Type:</span>
                         <span className="font-medium capitalize">{inspection.client_type || 'Unknown'}</span>
                       </div>
                     </div>
                   </div>
                 </div>
                 
                 <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
                   <div className="flex items-start gap-3">
                     <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                     <div>
                       <h4 className="font-semibold text-orange-800 mb-2">Important Safety Notice</h4>
                       <p className="text-orange-700 text-sm leading-relaxed">
                         Asbestos-containing materials can be found in buildings constructed before 1980. 
                         These materials are generally safe when undisturbed, but can release harmful fibers 
                         when damaged, renovated, or demolished. Always consult with certified asbestos 
                         professionals before any construction work.
                       </p>
                     </div>
                   </div>
                 </div>
                 
                 {/* Material Assessment Section */}
                 <div className="bg-white/50 p-4 rounded-lg border border-orange-200">
                   <div className="flex items-center justify-between mb-3">
                     <h4 className="font-semibold text-orange-800">Material Assessment</h4>
                     {currentUser && (currentUser.role === 'admin' || currentUser.is_admin) && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={isEditingMaterials ? handleCancelEditMaterials : handleStartEditMaterials}
                         className="text-orange-600 border-orange-300 hover:bg-orange-50"
                       >
                         {isEditingMaterials ? (
                           <>
                             <X className="w-4 h-4 mr-2" />
                             Cancel
                           </>
                         ) : (
                           <>
                             <Edit className="w-4 h-4 mr-2" />
                             Edit
                           </>
                         )}
                       </Button>
                     )}
                   </div>
                   
                   {isEditingMaterials ? (
                     <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                             <Label className="text-slate-600 text-sm">Material Type</Label>
                             <Select value={editingMaterialType} onValueChange={setEditingMaterialType}>
                               <SelectTrigger className="mt-1">
                                 <SelectValue placeholder="Select material type" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="roofing">Roofing</SelectItem>
                                 <SelectItem value="insulation">Insulation</SelectItem>
                                 <SelectItem value="flooring">Flooring</SelectItem>
                                 <SelectItem value="ceiling_tiles">Ceiling Tiles</SelectItem>
                                 <SelectItem value="wallboard">Wallboard</SelectItem>
                                 <SelectItem value="textured_coatings">Textured Coatings</SelectItem>
                                 <SelectItem value="pipe_insulation">Pipe Insulation</SelectItem>
                                 <SelectItem value="duct_insulation">Duct Insulation</SelectItem>
                                 <SelectItem value="fireproofing">Fireproofing</SelectItem>
                                 <SelectItem value="other">Other</SelectItem>
                               </SelectContent>
                             </Select>
                             
                             {/* Custom input for "Other" */}
                             {editingMaterialType === 'other' && (
                               <Input
                                 value={customMaterialType}
                                 onChange={(e) => setCustomMaterialType(e.target.value)}
                                 placeholder="Specify material type"
                                 className="mt-2"
                               />
                             )}
                           </div>
                         <div>
                           <Label className="text-slate-600 text-sm">Material Condition</Label>
                           <Select value={editingMaterialCondition} onValueChange={setEditingMaterialCondition}>
                             <SelectTrigger className="mt-1">
                               <SelectValue placeholder="Select condition" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Good">Good</SelectItem>
                               <SelectItem value="Fair">Fair</SelectItem>
                               <SelectItem value="Poor">Poor</SelectItem>
                               <SelectItem value="Deteriorating">Deteriorating</SelectItem>
                               <SelectItem value="Damaged">Damaged</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                       </div>
                       
                                                <div className="flex gap-2">
                           <Button
                             onClick={handleSaveMaterials}
                             disabled={saving}
                             className="bg-orange-600 hover:bg-orange-700"
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
                           <Button
                             variant="outline"
                             onClick={handleCancelEditMaterials}
                             className="border-orange-300 text-orange-600 hover:bg-orange-50"
                           >
                             Cancel
                           </Button>
                         </div>
                         
                         {/* Material Images URL Editor */}
                         <div className="mt-4">
                           <Label className="text-slate-600 text-sm">Material Images URLs (one per line)</Label>
                           <Textarea
                             value={inspection.material_images ? inspection.material_images.join('\n') : ''}
                             onChange={(e) => {
                               const urls = e.target.value.split('\n').filter(url => url.trim());
                               setInspection(prev => ({
                                 ...prev,
                                 material_images: urls
                               }));
                             }}
                             placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                             className="mt-1 font-mono text-xs"
                             rows={3}
                           />
                           <p className="text-xs text-slate-500 mt-1">
                             Enter image URLs, one per line. Changes will be saved when you click "Save Changes".
                           </p>
                           
                           <div className="flex gap-2 mt-2">
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={handleAddMaterialImageUrl}
                               className="text-xs px-2 py-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                             >
                               Add URL
                             </Button>
                             
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => {
                                 const urls = prompt('Enter image URLs (one per line):', 
                                   inspection.material_images ? inspection.material_images.join('\n') : '');
                                 if (urls !== null) {
                                   const urlArray = urls.split('\n').filter(url => url.trim());
                                   handleUpdateMaterialImages(urlArray);
                                 }
                               }}
                               className="text-xs px-2 py-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                             >
                               Replace All URLs
                             </Button>
                           </div>
                         </div>
                     </div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <Label className="text-slate-600 text-sm">Material Type</Label>
                         <p className="font-medium text-slate-800 mt-1">
                           {inspection.material_type || 'Not specified'}
                         </p>
                       </div>
                       <div>
                         <Label className="text-slate-600 text-sm">Material Condition</Label>
                         <p className="font-medium text-slate-800 mt-1">
                           {inspection.material_condition || 'Not assessed'}
                         </p>
                       </div>
                     </div>
                   )}
                   
                                        {/* Material Images */}
                     <div className="mt-4">
                       <div className="flex items-center justify-between mb-2">
                         <Label className="text-slate-600 text-sm">Material Images</Label>
                         {currentUser && (currentUser.role === 'admin' || currentUser.is_admin) && (
                           <div className="flex items-center gap-2">
                             <input
                               type="file"
                               multiple
                               accept="image/*"
                               onChange={handleMaterialImageUpload}
                               className="hidden"
                               id="material-image-upload"
                             />
                             <label
                               htmlFor="material-image-upload"
                               className="cursor-pointer inline-flex items-center gap-2 px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                             >
                               <Upload className="w-3 h-3" />
                               Upload Images
                             </label>
                           </div>
                         )}
                       </div>
                     
                     {inspection.material_images && inspection.material_images.length > 0 ? (
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                         {inspection.material_images.map((image, index) => (
                           <div key={index} className="relative group">
                             <img
                               src={image}
                               alt={`Material ${index + 1}`}
                               className="w-full h-24 object-cover rounded-lg border border-orange-200 cursor-pointer hover:opacity-80 transition-opacity"
                               onClick={() => window.open(image, '_blank')}
                               onError={(e) => {
                                 e.target.style.display = 'none';
                                 e.target.nextElementSibling.style.display = 'flex';
                               }}
                             />
                             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                               <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                             </div>
                             
                             {/* Delete button for admin users */}
                             {currentUser && (currentUser.role === 'admin' || currentUser.is_admin) && (
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleRemoveMaterialImage(index);
                                 }}
                                 className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                 title="Remove image"
                               >
                                 <X className="w-3 h-3" />
                               </button>
                             )}
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="text-center py-8 text-slate-500 border-2 border-dashed border-orange-200 rounded-lg">
                         <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                         <p className="text-sm">No material images uploaded yet</p>
                         {currentUser && (currentUser.role === 'admin' || currentUser.is_admin) && (
                           <div className="mt-3 space-y-2">
                             <input
                               type="file"
                               multiple
                               accept="image/*"
                               onChange={handleMaterialImageUpload}
                               className="hidden"
                               id="material-image-upload-empty"
                             />
                             <label
                               htmlFor="material-image-upload-empty"
                               className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                             >
                               <Upload className="w-4 h-4" />
                               Upload Material Images
                             </label>
                             
                             <div className="text-xs text-slate-500">
                               <p>Or add image URLs directly:</p>
                               <div className="flex gap-2 mt-1">
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => {
                                     const urls = prompt('Enter image URLs (one per line):');
                                     if (urls !== null) {
                                       const urlArray = urls.split('\n').filter(url => url.trim());
                                       if (urlArray.length > 0) {
                                         handleUpdateMaterialImages(urlArray);
                                       }
                                     }
                                   }}
                                   className="text-xs px-2 py-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                                 >
                                   Add URLs
                                 </Button>
                                 
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={handleAddMaterialImageUrl}
                                   className="text-xs px-2 py-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                                 >
                                   Add Single URL
                                 </Button>
                               </div>
                             </div>
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 </div>
               </CardContent>
             </Card>
           )}

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
                {inspectionType === 'asbestos' ? 'Laboratory Analysis' : 'Lab Analysis'}
              </CardTitle>
              <CardDescription>
                {inspectionType === 'asbestos' 
                  ? 'Upload and analyze laboratory asbestos test results'
                  : 'Upload and analyze laboratory mold test results'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {(!inspection.lab_analysis_images || inspection.lab_analysis_images.length === 0) ? (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  {console.log("🔍 DEBUG: No lab analysis images found, showing upload section")}
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
                          <p className="text-slate-600 font-medium text-lg">
                            {inspectionType === 'asbestos' ? 'Upload Asbestos Lab Analysis Images' : 'Upload Lab Analysis Images'}
                          </p>
                          <p className="text-slate-500 text-sm mt-2">
                            {inspectionType === 'asbestos'
                              ? 'Click to select one or more images of the asbestos lab analysis results'
                              : 'Click to select one or more images of the lab analysis results'
                            }
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
                  {console.log("🔍 DEBUG: Lab analysis images found:", inspection.lab_analysis_images)}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <Label className="text-slate-600 font-medium">
                      Lab Analysis Images ({inspection.lab_analysis_images.length})
                    </Label>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {inspection.lab_analysis_images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          {!labImageErrors[index] ? (
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
                                // Prevent further error propagation
                                e.preventDefault();
                                
                                // Use React state instead of direct DOM manipulation
                                setLabImageErrors(prev => {
                                  const newErrors = { ...prev };
                                  newErrors[index] = true;
                                  return newErrors;
                                });
                            }}
                          />
                          ) : (
                            <div className="w-full h-48 bg-slate-100 rounded-lg border-2 border-slate-200 flex items-center justify-center">
                            <div className="text-center">
                              <ImageOff className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-slate-500 text-sm">Image failed to load</p>
                                <p className="text-slate-400 text-xs mt-1">Image {index + 1}</p>
                            </div>
                          </div>
                          )}
                          
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
                                
                                // If this was the last image, also clear the conclusion and recommendations
                                const shouldClearAnalysis = updatedImages.length === 0;
                                
                                const updateData = {
                                  lab_analysis_images: updatedImages
                                };
                                
                                if (shouldClearAnalysis && inspectionType !== 'asbestos') {
                                  updateData.lab_conclusion = "";
                                  updateData.lab_recommendations = "";
                                  console.log("🔍 DEBUG: Clearing analysis fields since no images remain");
                                }
                                
                                const updateEntity = inspectionType === 'asbestos' ? AsbestosInspection : MoldInspection;
                                updateEntity.update(inspectionId, updateData).then(() => {
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
                      
                      {inspection.lab_analysis_images && inspection.lab_analysis_images.length > 0 && inspectionType !== 'asbestos' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            console.log("🔥 SIMPLE BUTTON CLICKED!");
                            console.log("🔍 Available images:", inspection.lab_analysis_images);
                            
                            if (confirm('Generate AI analysis for the lab images?')) {
                              console.log("✅ User confirmed, starting simple analysis...");
                              setGeneratingAnalysis(true);
                              
                           try {
                                 // Simple implementation - just update with mock data for now
                                 console.log("📝 Updating with mock analysis...");
                                 
                                 const newConclusion = inspectionType === 'asbestos' 
                                   ? `Asbestos lab analysis results for ${inspection.street_address}: Based on the uploaded images, professional asbestos assessment required. Please examine the lab results and update this conclusion with specific findings.`
                                   : `Lab analysis results for ${inspection.street_address}: Based on the uploaded images, professional review required. Please examine the lab results and update this conclusion with specific findings.`;
                                 const newRecommendations = inspectionType === 'asbestos'
                                   ? `1. Review asbestos lab results manually\n2. Consult with asbestos specialist if needed\n3. Implement asbestos management plan based on findings\n4. Schedule follow-up asbestos testing if required`
                                   : `1. Review lab results manually\n2. Consult with mold specialist if needed\n3. Implement remediation based on findings\n4. Schedule follow-up testing`;
                                 
                                 console.log("🔍 DEBUG: About to save:", { newConclusion, newRecommendations });
                                 
                                 // Only save to database for mold inspections
                                 if (inspectionType !== 'asbestos') {
                                   const updateEntity = inspectionType === 'asbestos' ? AsbestosInspection : MoldInspection;
                                   await updateEntity.update(inspectionId, {
                                     lab_conclusion: newConclusion,
                                     lab_recommendations: newRecommendations
                                   });
                                 }
                                 
                                 console.log("✅ Mock analysis saved to database!");
                                 
                                 // Update local state immediately - NO RELOAD NEEDED
                                 console.log("🔄 Updating local inspection state...");
                                 setInspection(prev => ({
                                   ...prev,
                                   lab_conclusion: newConclusion,
                                   lab_recommendations: newRecommendations
                                 }));
                                 
                                 console.log("✅ Analysis complete! Fields should now show the content and stay visible.");
                                 
                                 alert(inspectionType === 'asbestos' 
                                   ? "Asbestos analysis added! Check the Conclusion and Recommendations fields below."
                                   : "Analysis added! Check the Conclusion and Recommendations fields below."
                                 );
                                
                              } catch (error) {
                                console.error("❌ Simple analysis error:", error);
                                alert(`Error: ${error.message}`);
                              } finally {
                                setGeneratingAnalysis(false);
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
                          {generatingAnalysis ? 'Analyzing...' : inspectionType === 'asbestos' ? 'Analyze Asbestos Results' : 'Analyze with AI'}
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to remove all lab analysis images?')) {
                            console.log("🔍 DEBUG: Removing all lab analysis images for inspection ID:", inspectionId);
                            const updateEntity = inspectionType === 'asbestos' ? AsbestosInspection : MoldInspection;
                            const updateData = { lab_analysis_images: [] };
                            
                            // Only add conclusion/recommendations for mold inspections
                            if (inspectionType !== 'asbestos') {
                              updateData.lab_conclusion = "";
                              updateData.lab_recommendations = "";
                            }
                            
                            updateEntity.update(inspectionId, updateData).then(() => {
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
                </div>
              )}


              {generatingAnalysis && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <div>
                      <span className="text-blue-800 font-medium">
                        {inspectionType === 'asbestos' ? 'Analyzing asbestos lab results...' : 'Analyzing lab results...'}
                      </span>
                      <p className="text-blue-700 text-sm mt-1">
                        AI is generating professional conclusions and recommendations based on the {inspectionType === 'asbestos' ? 'asbestos lab analysis' : 'lab analysis'}.
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
                      {inspection.lab_analysis_images.length} {inspectionType === 'asbestos' ? 'asbestos lab analysis' : 'lab analysis'} image(s) uploaded successfully
                    </span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    The images have been processed and are ready for analysis. Click on any image to view it in full size.
                  </p>
                </div>
              )}
              
              {/* Hidden file input for lab analysis uploads - always available */}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleLabImageUpload}
                className="hidden"
                id="lab-analysis-upload"
                disabled={uploadingImage}
              />
            </CardContent>
          </Card>

          {/* Conclusions & Recommendations - Only for Mold Inspections */}
          {inspectionType !== 'asbestos' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {inspectionType === 'asbestos' ? 'Asbestos Report Content' : 'Report Content'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="conclusion">Conclusion</Label>
                <Textarea
                  id="conclusion"
                  value={
                    (inspection.lab_conclusion || "") 
                  }
                  onChange={e => setInspection({ ...inspection, lab_conclusion: e.target.value })}
                  placeholder={inspectionType === 'asbestos' 
                    ? "Professional conclusion and recommendations based on asbestos lab analysis..."
                    : "Professional conclusion and recommendations based on lab analysis..."
                  }
                  className="min-h-32 mt-2"
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={inspection.lab_recommendations || ""}
                  onChange={e => setInspection({ ...inspection, lab_recommendations: e.target.value })}
                  placeholder={inspectionType === 'asbestos' 
                    ? "Detailed asbestos assessment recommendations for the client..."
                    : "Detailed recommendations for the client..."
                  }
                  className="min-h-32 mt-2"
                />
              </div>

              {saving && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <div>
                      <span className="text-blue-800 font-medium">Processing...</span>
                      <p className="text-blue-700 text-sm mt-1">
                        {inspectionType === 'asbestos' 
                          ? 'Saving asbestos assessment changes and regenerating report with updated content.'
                          : 'Saving lab analysis changes and regenerating report with updated content.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {inspectionType === 'asbestos' 
                      ? 'Saving Asbestos Assessment Changes...'
                      : 'Saving Changes & Regenerating Report...'
                    }
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {inspectionType === 'asbestos' ? 'Save Asbestos Assessment' : 'Save Changes'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          )}




        </div>
      </div>
    </div>
  );
};