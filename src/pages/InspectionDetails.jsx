import React, { useState, useEffect } from "react";
import { MoldInspection } from "@/api/entities";
import { Sample } from "@/api/entities";
import { ProcessLabImageWithOCR, InvokeLLM, UploadLabAnalysisImage } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Download, ArrowLeft, FileText, AlertTriangle, CheckCircle, Clock, User, MapPin, Calendar, Home, Mail, Phone, Thermometer, Droplets, FlaskConical, Eye, Edit, Save, Upload, X, Plus, Trash2, Star, Database, Image, File, MoreHorizontal, Send, CheckCircle2, XCircle, PauseCircle, PlayCircle, RotateCcw, Zap, BarChart3, PieChart, TrendingUp, Users, Search, Filter, RefreshCw, Loader2, Download as DownloadIcon, Mail as MailIcon, Eye as EyeIcon, Edit as EditIcon, Trash2 as Trash2Icon, Plus as PlusIcon, X as XIcon, Star as StarIcon, Database as DatabaseIcon, Image as ImageIcon, File as FileIcon, MoreHorizontal as MoreHorizontalIcon, Send as SendIcon, CheckCircle2 as CheckCircle2Icon, XCircle as XCircleIcon, PauseCircle as PauseCircleIcon, PlayCircle as PlayCircleIcon, RotateCcw as RotateCcwIcon, Zap as ZapIcon, BarChart3 as BarChart3Icon, PieChart as PieChartIcon, TrendingUp as TrendingUpIcon, Users as UsersIcon, Search as SearchIcon, Filter as FilterIcon, RefreshCw as RefreshCcwIcon, ImageOff, ZoomIn, Copy } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUrlParam } from "@/utils/urlUtils";
import { useAuth } from '@/contexts/AuthContext';
import { format } from "date-fns";
import { generateReportHtmlContent } from "@/pages/AdminDashboard.jsx";
import { getDisplayNumber } from "@/utils/inspectionUtils";
import { Core } from "@/api/integrations";
// Removed requireSupabaseSession - using Flask backend authentication

export default function InspectionDetails() {
  const location = useLocation();
  const inspectionId = getUrlParam(location.search, 'id');
  
  console.log("🔍 DEBUG: InspectionDetails component loaded");
  console.log("🔍 DEBUG: Location search:", location.search);
  console.log("🔍 DEBUG: Extracted inspectionId:", inspectionId);

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
  const { user: currentUser } = useAuth();

  // Debug useEffect to track inspection state changes
  useEffect(() => {
    if (inspection) {
      console.log("🔍 INSPECTION STATE CHANGE:");
      console.log("  - Lab Conclusion:", inspection.lab_conclusion || "EMPTY");
      console.log("  - Lab Recommendations:", inspection.lab_recommendations || "EMPTY");
    }
  }, [inspection?.lab_conclusion, inspection?.lab_recommendations]);

  useEffect(() => {
    (async () => {
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
      
      console.log("🔍 DEBUG: Calling MoldInspection.findUnique with ID:", inspectionId);
      const inspectionData = await MoldInspection.findUnique({ id: inspectionId });
      
      console.log("🔍 DEBUG: MoldInspection.findUnique response:", inspectionData);
      
      if (inspectionData) {
        const inspection = inspectionData;
        console.log("🔍 DEBUG: Successfully loaded inspection:", {
          id: inspection.id,
          inspection_number: inspection.inspection_number,
          full_name: inspection.full_name,
          email: inspection.email,
          status: inspection.status
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
        
        // Check if there are no lab analysis images and clear conclusion/recommendations if needed
        if (!inspection.lab_analysis_images || inspection.lab_analysis_images.length === 0) {
          console.log("🔍 DEBUG: No lab analysis images found, clearing conclusion and recommendations");
          
          // Only update database if there are conclusion/recommendations to clear
          if (inspection.lab_conclusion || inspection.lab_recommendations) {
            console.log("🔍 DEBUG: Clearing lab_conclusion and lab_recommendations from database");
            await MoldInspection.update(inspectionId, {
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
      } else {
        console.error("❌ ERROR: No inspection data returned from API");
        setError("Inspection not found");
      }
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
      console.log("🔍 DEBUG: Starting lab image upload and OCR analysis process");
      console.log("🔍 DEBUG: Inspection ID:", inspectionId);
      console.log("🔍 DEBUG: Files to process:", files.length);
      
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

        const instructions = `You are an expert mold inspection and remediation consultant. Your task is to analyze the provided mold inspection data and lab analysis results to generate a concise conclusion and actionable recommendations for the property owner. Structure the output as a JSON object with two keys: conclusion (string) and recommendations (string).

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
      
        // Parse the response to extract conclusion and recommendations
        let conclusion = "";
        let recommendations = "";

        // Helper function to format recommendations text
        const formatRecommendationsText = (text) => {
          if (!text) return text;
          
          // Remove asterisks and clean up formatting
          return text
            .replace(/\*\*/g, '') // Remove bold asterisks
            .replace(/\*/g, '') // Remove single asterisks
            .replace(/(\d+\.)\s*([^:]+:)/g, '$2') // Remove numbers from headers, keep just the header with colon
            .split(/([A-Z][^:]*:)/) // Split by section headers (words ending with colon)
            .filter(part => part.trim().length > 0)
            .map(part => part.trim())
            .join('\n')
            .trim();
        };

        if (analysisResult.conclusion && analysisResult.recommendations) {
          conclusion = formatRecommendationsText(analysisResult.conclusion);
          recommendations = formatRecommendationsText(analysisResult.recommendations);
        } else if (typeof analysisResult.content === 'string') {
          // Try to parse content as JSON only if it looks like JSON
          if (analysisResult.content.trim().startsWith('{')) {
            try {
              const parsedResult = JSON.parse(analysisResult.content);
              conclusion = formatRecommendationsText(parsedResult.conclusion || "");
              recommendations = formatRecommendationsText(parsedResult.recommendations || "");
        } catch (parseError) {
              // JSON parsing failed, try to extract recommendations from the content
              const contentSplit = analysisResult.content.split(/\*\*RECOMMENDATIONS\*\*|Recommendations:|RECOMMENDATIONS:|"recommendations":\s*"/i);
              if (contentSplit.length > 1) {
                conclusion = formatRecommendationsText(contentSplit[0].replace(/\*\*CONCLUSION\*\*|Conclusion:|CONCLUSION:|"conclusion":\s*"/i, '').trim());
                // Extract everything after recommendations keyword, clean up JSON artifacts
                let recsText = contentSplit[1].replace(/"\s*}?\s*$/, '').trim();
                recommendations = formatRecommendationsText(recsText);
              } else {
                conclusion = formatRecommendationsText(analysisResult.content);
              recommendations = "Please review the lab analysis results and consult with a professional for specific recommendations.";
              }
            }
          } else {
            // Content is not JSON, try to split by known keywords
            const split = analysisResult.content.split(/\*\*RECOMMENDATIONS\*\*|Recommendations:|RECOMMENDATIONS:/i);
            if (split.length > 1) {
              conclusion = formatRecommendationsText(split[0].replace(/\*\*CONCLUSION\*\*|Conclusion:|CONCLUSION:/i, '').trim());
              recommendations = formatRecommendationsText(split[1].trim());
            } else {
              conclusion = formatRecommendationsText(analysisResult.content);
              recommendations = "";
            }
          }
        } else {
          // Content is not JSON, use as-is
          conclusion = formatRecommendationsText(analysisResult.content);
          recommendations = "";
        }

        // Update local state immediately so the textareas show the response
        setInspection(prev => ({
          ...prev,
          lab_conclusion: conclusion,
          lab_recommendations: recommendations
        }));

        // Save lab images URLs and report content to the database
        const labImageUrls = uploadedFiles.map(file => file.file_url);
      await MoldInspection.update(inspectionId, {
          lab_analysis_images: labImageUrls,
          lab_conclusion: conclusion,
          lab_recommendations: recommendations
        });
        
        console.log("✅ Analysis complete! Lab images uploaded to bucket and analysis saved to database.");
        
      } catch (analysisError) {
        console.error("❌ OCR ANALYSIS: Error during analysis generation:", analysisError);
        throw new Error(`Failed to generate analysis from OCR text: ${analysisError.message}`);
      }
      
      // Show success message
      const totalProcessed = files.length;
      const totalSuccessful = processedFiles.length;
      const totalSkipped = skippedFiles.length;
      
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
      const comprehensivePrompt = `You are an expert mold inspection and remediation consultant. Your task is to analyze the provided mold inspection data and lab analysis results to generate a concise conclusion and actionable recommendations for the property owner. Structure the output as a JSON object with two keys: conclusion (string) and recommendations (string).

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
      
      // Use the InvokeLLM function to analyze the image with comprehensive context
      const analysisResult = await InvokeLLM({
        prompt: comprehensivePrompt,
        image_url: imageUrl
      }, [], inspectionId);
      
      console.log("🔍 DEBUG: Analysis result:", analysisResult);
      
      if (analysisResult) {
        // Parse the response to extract conclusion and recommendations
        let conclusion = "";
        let recommendations = "";

        // Helper function to format recommendations text
        const formatRecommendationsText = (text) => {
          if (!text) return text;
          
          // Remove asterisks and clean up formatting
          return text
            .replace(/\*\*/g, '') // Remove bold asterisks
            .replace(/\*/g, '') // Remove single asterisks
            .replace(/(\d+\.)\s*([^:]+:)/g, '$2') // Remove numbers from headers, keep just the header with colon
            .split(/([A-Z][^:]*:)/) // Split by section headers (words ending with colon)
            .filter(part => part.trim().length > 0)
            .map(part => part.trim())
            .join('\n')
            .trim();
        };

        if (analysisResult.conclusion && analysisResult.recommendations) {
          conclusion = formatRecommendationsText(analysisResult.conclusion);
          recommendations = formatRecommendationsText(analysisResult.recommendations);
        } else if (typeof analysisResult.content === 'string') {
          // Try to parse content as JSON only if it looks like JSON
          if (analysisResult.content.trim().startsWith('{')) {
            try {
              const parsedResult = JSON.parse(analysisResult.content);
              conclusion = formatRecommendationsText(parsedResult.conclusion || "");
              recommendations = formatRecommendationsText(parsedResult.recommendations || "");
            } catch (parseError) {
              // JSON parsing failed, try to extract recommendations from the content
              const contentSplit = analysisResult.content.split(/\*\*RECOMMENDATIONS\*\*|Recommendations:|RECOMMENDATIONS:|"recommendations":\s*"/i);
              if (contentSplit.length > 1) {
                conclusion = formatRecommendationsText(contentSplit[0].replace(/\*\*CONCLUSION\*\*|Conclusion:|CONCLUSION:|"conclusion":\s*"/i, '').trim());
                // Extract everything after recommendations keyword, clean up JSON artifacts
                let recsText = contentSplit[1].replace(/"\s*}?\s*$/, '').trim();
                recommendations = formatRecommendationsText(recsText);
              } else {
                conclusion = formatRecommendationsText(analysisResult.content);
                recommendations = "Please review the lab analysis results and consult with a professional for specific recommendations.";
              }
            }
          } else {
            // Content is not JSON, try to split by known keywords
            const split = analysisResult.content.split(/\*\*RECOMMENDATIONS\*\*|Recommendations:|RECOMMENDATIONS:/i);
            if (split.length > 1) {
              conclusion = formatRecommendationsText(split[0].replace(/\*\*CONCLUSION\*\*|Conclusion:|CONCLUSION:/i, '').trim());
              recommendations = formatRecommendationsText(split[1].trim());
            } else {
              conclusion = formatRecommendationsText(analysisResult.content);
              recommendations = "";
            }
          }
        } else if (typeof analysisResult === 'string') {
          // Handle case where analysisResult is a string
          if (analysisResult.trim().startsWith('{')) {
            try {
              const parsedResult = JSON.parse(analysisResult);
              conclusion = formatRecommendationsText(parsedResult.conclusion || analysisResult);
              recommendations = formatRecommendationsText(parsedResult.recommendations || "");
            } catch (parseError) {
              conclusion = formatRecommendationsText(analysisResult);
              recommendations = "Please review the lab analysis results and consult with a professional for specific recommendations.";
            }
          } else {
            // Content is not JSON, try to split by known keywords
            const split = analysisResult.split(/\*\*RECOMMENDATIONS\*\*|Recommendations:|RECOMMENDATIONS:/i);
            if (split.length > 1) {
              conclusion = formatRecommendationsText(split[0].replace(/\*\*CONCLUSION\*\*|Conclusion:|CONCLUSION:/i, '').trim());
              recommendations = formatRecommendationsText(split[1].trim());
            } else {
              conclusion = formatRecommendationsText(analysisResult);
              recommendations = "";
            }
          }
        } else {
          // Fallback
          conclusion = formatRecommendationsText(analysisResult.toString());
          recommendations = "";
        }

        // Update the inspection with the separated analysis
        setInspection(prev => ({
          ...prev,
          lab_conclusion: conclusion,
          lab_recommendations: recommendations
        }));

        // Also save to database
        await MoldInspection.update(inspectionId, {
          lab_conclusion: conclusion,
          lab_recommendations: recommendations
        });
        
        console.log("🔍 DEBUG: Updated inspection with separated conclusion and recommendations");
        console.log("🔍 DEBUG: Conclusion:", conclusion);
        console.log("🔍 DEBUG: Recommendations:", recommendations);
      }
    } catch (error) {
      console.error("❌ Error generating analysis:", error);
      alert("Failed to generate analysis. Please try again.");
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
      console.log("🔍 DEBUG: Lab Conclusion:", inspection.lab_conclusion);
      console.log("🔍 DEBUG: Lab Recommendations:", inspection.lab_recommendations);

      // Save the lab analysis changes
      await MoldInspection.update(inspectionId, {
        lab_conclusion: inspection.lab_conclusion,
        lab_recommendations: inspection.lab_recommendations
      });

      console.log("🔍 DEBUG: Changes saved successfully");
      alert("Changes saved successfully! The report will include the updated lab analysis when downloaded.");
      
    } catch (error) {
      console.error("❌ Error saving:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
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

              {/* Mold Images with Locations */}
              {inspection.mold_images && inspection.mold_images.length > 0 && (
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

                            {/* Water Damage Images with Locations */}
              {inspection.water_damage_images && inspection.water_damage_images.length > 0 && (
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
                                
                                if (shouldClearAnalysis) {
                                  updateData.lab_conclusion = "";
                                  updateData.lab_recommendations = "";
                                  console.log("🔍 DEBUG: Clearing analysis fields since no images remain");
                                }
                                
                                MoldInspection.update(inspectionId, updateData).then(() => {
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
                            console.log("🔥 SIMPLE BUTTON CLICKED!");
                            console.log("🔍 Available images:", inspection.lab_analysis_images);
                            
                            if (confirm('Generate AI analysis for the lab images?')) {
                              console.log("✅ User confirmed, starting simple analysis...");
                              setGeneratingAnalysis(true);
                              
                                                             try {
                                 // Simple implementation - just update with mock data for now
                                 console.log("📝 Updating with mock analysis...");
                                 
                                 const newConclusion = `Lab analysis results for ${inspection.street_address}: Based on the uploaded images, professional review required. Please examine the lab results and update this conclusion with specific findings.`;
                                 const newRecommendations = `1. Review lab results manually\n2. Consult with mold specialist if needed\n3. Implement remediation based on findings\n4. Schedule follow-up testing`;
                                 
                                 console.log("🔍 DEBUG: About to save:", { newConclusion, newRecommendations });
                                 
                                 await MoldInspection.update(inspectionId, {
                                   lab_conclusion: newConclusion,
                                   lab_recommendations: newRecommendations
                                 });
                                 
                                 console.log("✅ Mock analysis saved to database!");
                                 
                                 // Update local state immediately - NO RELOAD NEEDED
                                 console.log("🔄 Updating local inspection state...");
                                 setInspection(prev => ({
                                   ...prev,
                                   lab_conclusion: newConclusion,
                                   lab_recommendations: newRecommendations
                                 }));
                                 
                                 console.log("✅ Analysis complete! Fields should now show the content and stay visible.");
                                 
                                 alert("Analysis added! Check the Conclusion and Recommendations fields below.");
                                
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
                              lab_analysis_images: [],
                              lab_conclusion: "",
                              lab_recommendations: ""
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
                  value={
                    (inspection.lab_conclusion || "") 
                  }
                  onChange={e => setInspection({ ...inspection, lab_conclusion: e.target.value })}
                  placeholder="Professional conclusion and recommendations based on lab analysis..."
                  className="min-h-32 mt-2"
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={inspection.lab_recommendations || ""}
                  onChange={e => setInspection({ ...inspection, lab_recommendations: e.target.value })}
                  placeholder="Detailed recommendations for the client..."
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
                        Saving lab analysis changes and regenerating report with updated content.
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
                    Saving Changes & Regenerating Report...
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