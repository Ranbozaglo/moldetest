import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, RefreshCw, Eye, Mail, CheckCircle, AlertTriangle, FlaskConical, FileText, Zap } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { EmailService } from "@/api/entities";

const EmailTemplateManager = () => {
  const [templates, setTemplates] = useState({
    lab_received: {
      subject: "Total Testing - Lab Samples Received (Inspection #{inspection_number})",
      body: `<html>
<body>
    <p>Hi {full_name},</p>
    
    <p>Just a quick update, your mold test samples have been received by our lab and are now being processed.</p>
    
    <p>Our team is reviewing the findings and preparing your personalized report. You can expect to receive your full results and expert interpretation within 48–72 business hours.</p>
    
    <p>You can track the status of your report here: <a href="{dashboard_url}" style="color: #004aac; text-decoration: none; font-weight: bold;">Track My Report</a></p>
    
    <p>We'll notify you the moment your report is ready.</p>
    
    <p>Thank you for trusting Total Testing with your health and home!</p>
    
    <br>
    <p>Warm regards,<br>Total Testing</p>
</body>
</html>`
    },
    report_ready: {
      subject: "Total Testing - Report Ready (Inspection #{inspection_number})",
      body: `<html>
<body>
    <p>Hi {full_name},</p>
    
    <p>Your lab results and mold inspection report are now ready to view in your secure portal.</p>
    
    <p><strong>This report includes:</strong></p>
    <ul style="margin-left: 20px; line-height: 1.6;">
        <li>Inspection finding</li>
        <li>Lab-verified analysis of your samples</li>
        <li>Mold types identified and spore levels</li>
        <li>Professional interpretation and next steps (if needed)</li>
    </ul>
    
    <p>🔗 View your report now by visiting your portal:</p>
    <p>👉 <a href="{dashboard_url}" style="color: #004aac; text-decoration: none; font-weight: bold; background-color: #f0f8ff; padding: 8px 16px; border-radius: 5px; display: inline-block;">Access Your Report</a></p>
    
    <br>
    <p>Thanks again for choosing Total Testing!</p>
</body>
</html>`
    },
    review_request: {
      subject: "Total Testing - Review Request (Inspection #{inspection_number})",
      body: `<html>
<body>
    <h2>Total Testing - Review Request</h2>
    <p>Dear {full_name},</p>
    <p>Thank you for using our mold testing services. We hope you found our service helpful.</p>
    <p>If you could take a moment to leave us a review, it would mean a lot to us and help other customers make informed decisions.</p>
    <p>Thank you for choosing Total Testing.</p>
    <br>
    <p>Best regards,<br>Total Testing Team</p>
</body>
</html>`
    },
    inspection_created: {
      subject: "Welcome to Total Testing - Inspection #{inspection_number} Created",
      body: `<html>
<body>
    <h2>Welcome to Total Testing!</h2>
    <p>Dear {full_name},</p>
    <p>Congratulations! Your mold inspection has been successfully created.</p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h3 style="color: #004aac; margin-top: 0;">Your Inspection Details:</h3>
        <p><strong>Inspection Number:</strong> {inspection_number}</p>
        <p><strong>Property Address:</strong> {street_address}{unit_number}, {city}, {state} {zip_code}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{dashboard_url}" style="background-color: #004aac; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View My Inspections
        </a>
    </div>
    
    <h3>📋 Next Steps:</h3>
    <ol>
        <li><strong>Collect Your Samples:</strong> Follow the sampling guide provided during your inspection setup</li>
        <li><strong>Send Samples to Lab:</strong> Use the prepaid shipping materials to send your samples</li>
        <li><strong>Track Progress:</strong> Monitor your inspection status in your dashboard</li>
        <li><strong>Receive Results:</strong> Get your detailed report within 3-5 business days</li>
    </ol>
        
    <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
    <p>Thank you for choosing Total Testing for your mold inspection needs!</p>
    
    <br>
    <p>Best regards,<br>The Total Testing Team</p>
</body>
</html>`
    }
  });

  const [activeTemplate, setActiveTemplate] = useState('lab_received');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  const templateInfo = {
    lab_received: {
      title: "Lab Samples Received",
      description: "Sent when lab samples are received and processing begins",
      icon: <FlaskConical className="w-4 h-4" />,
      color: "bg-blue-500"
    },
    report_ready: {
      title: "Report Ready",
      description: "Sent when mold analysis report is complete and ready for download",
      icon: <CheckCircle className="w-4 h-4" />,
      color: "bg-green-500"
    },
    review_request: {
      title: "Review Request",
      description: "Sent to request customer feedback and reviews after completion",
      icon: <Mail className="w-4 h-4" />,
      color: "bg-purple-500"
    },
    inspection_created: {
      title: "Inspection Created",
      description: "Sent when a new inspection is successfully created",
      icon: <CheckCircle className="w-4 h-4" />,
      color: "bg-indigo-500"
    }
  };

  const availableVariables = [
    { name: '{full_name}', description: 'Customer full name' },
    { name: '{inspection_number}', description: 'Inspection number' },
    { name: '{email}', description: 'Customer email address' },
    { name: '{street_address}', description: 'Property street address' },
    { name: '{unit_number}', description: 'Property unit number' },
    { name: '{city}', description: 'Property city' },
    { name: '{state}', description: 'Property state' },
    { name: '{zip_code}', description: 'Property zip code' },
    { name: '{property_type}', description: 'Type of property' },
    { name: '{client_type}', description: 'Type of client' },
    { name: '{dashboard_url}', description: 'Link to customer dashboard' }
  ];

  // Load templates from backend on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await EmailService.getTemplates();
        if (response && Object.keys(response).length > 0) {
          setTemplates(response);
        }
      } catch (error) {
        console.error('Failed to load email templates:', error);
        toast({
          title: "Load Failed",
          description: "Failed to load email templates. Using default templates.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const handleSubjectChange = (value) => {
    setTemplates(prev => ({
      ...prev,
      [activeTemplate]: {
        ...prev[activeTemplate],
        subject: value
      }
    }));
  };

  const handleBodyChange = (value) => {
    setTemplates(prev => ({
      ...prev,
      [activeTemplate]: {
        ...prev[activeTemplate],
        body: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('');

    try {
      await EmailService.saveTemplates(templates);
      
      setSaveStatus('success');
  
    } catch (error) {
      console.error('Failed to save email templates:', error);
      setSaveStatus('error');
      toast({
        title: "Save Failed",
        description: "Failed to save email templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleReset = async () => {
    try {
      const response = await EmailService.resetTemplates();
      if (response && Object.keys(response).length > 0) {
        setTemplates(response);
      }
      toast({
        title: "Templates Reset",
        description: "Email templates have been reset to default values.",
      });
    } catch (error) {
      console.error('Failed to reset email templates:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset email templates. Please try again.",
        variant: "destructive",
      });
    }
  };

  const insertVariable = (variable) => {
    const currentTemplate = templates[activeTemplate];
    const newBody = currentTemplate.body + variable;
    handleBodyChange(newBody);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading email templates...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <Tabs value={activeTemplate} onValueChange={setActiveTemplate} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 bg-gray-100 p-1 rounded-lg">
          {Object.entries(templateInfo).map(([key, info]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 p-2 md:p-3 data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-blue-200 data-[state=active]:shadow-sm rounded-md transition-all duration-200 hover:bg-gray-50 min-h-[60px] md:min-h-auto"
            >
              <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${info.color} shadow-sm flex-shrink-0`} />
              <div className="flex flex-col md:flex-row items-center gap-0.5 md:gap-1 min-w-0">
                <span className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0">{info.icon}</span>
                <span className="text-xs md:text-sm font-medium text-center md:text-left leading-tight">{info.title}</span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(templateInfo).map(([key, info]) => (
          <TabsContent key={key} value={key} className="space-y-4 md:space-y-6 mt-4 md:mt-6">
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${info.color} flex-shrink-0`}>
                  {React.cloneElement(info.icon, { className: "w-4 h-4 text-white" })}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base leading-tight">{info.title} Template</h3>
                  <p className="text-xs md:text-sm text-gray-600 leading-relaxed">{info.description}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
              {/* Editor */}
              <div className="xl:col-span-2 space-y-4">
                <Card className="shadow-md">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-3 md:p-6">
                    <CardTitle className="flex items-center gap-2 text-blue-800 text-sm md:text-base">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Edit Template Content</span>
                    </CardTitle>
                    <CardDescription className="text-blue-600 text-xs md:text-sm">
                      Customize the subject line and HTML body content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-3 md:p-6">
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-xs md:text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Mail className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        <span>Email Subject Line</span>
                      </Label>
                      <Input
                        id="subject"
                        value={templates[key]?.subject || ''}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        placeholder="Enter email subject line with variables..."
                        className="mt-1 bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                      <p className="text-xs text-gray-500">Use variables like {'{inspection_number}'} for dynamic content</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="body" className="text-xs md:text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FileText className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        <span>Email Body Content (HTML)</span>
                      </Label>
                      <Textarea
                        id="body"
                        value={templates[key]?.body || ''}
                        onChange={(e) => handleBodyChange(e.target.value)}
                        placeholder="Enter HTML email body content..."
                        className="mt-1 min-h-[300px] md:min-h-[400px] font-mono text-xs md:text-sm bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500">Full HTML content including styling and variables</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto text-sm"
                      >
                        {saving ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>

                      <Button 
                        variant="outline" 
                        onClick={handleReset}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto text-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">Reset to Default</span>
                        <span className="sm:hidden">Reset</span>
                      </Button>

                      {saveStatus && (
                        <div className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
                          {saveStatus === 'success' && (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Saved
                            </Badge>
                          )}
                          {saveStatus === 'error' && (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Variables Helper */}
              <div className="space-y-4">
                <Card className="shadow-md border-purple-200">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b p-3 md:p-6">
                    <CardTitle className="text-xs md:text-sm flex items-center gap-2 text-purple-800">
                      <Zap className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                      <span>Available Variables</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-purple-600">
                      Click any variable to insert into your template
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6">
                    <div className="space-y-2">
                      {availableVariables.map((variable) => (
                        <div
                          key={variable.name}
                          className="p-2 md:p-3 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition-all duration-200 group active:scale-95"
                          onClick={() => insertVariable(variable.name)}
                        >
                          <div className="font-mono text-xs md:text-sm text-purple-700 group-hover:text-purple-800 font-medium break-all">
                            {variable.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 group-hover:text-purple-600 leading-relaxed">
                            {variable.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md border-green-200">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b p-3 md:p-6">
                    <CardTitle className="text-xs md:text-sm flex items-center gap-2 text-green-800">
                      <Eye className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                      <span>Live Preview</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-green-600">
                      Real-time preview of your email template
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6">
                    <div className="border border-gray-200 rounded-lg p-3 md:p-4 bg-white max-h-60 md:max-h-80 overflow-y-auto">
                      <div className="space-y-3 md:space-y-4">
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span>Subject Line:</span>
                          </div>
                          <div className="p-2 md:p-3 bg-gray-50 rounded-md border text-xs md:text-sm font-medium break-words">
                            {templates[key]?.subject || 'No subject defined'}
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <FileText className="w-3 h-3 flex-shrink-0" />
                            <span>Email Body:</span>
                          </div>
                          <div 
                            className="p-2 md:p-3 bg-gray-50 rounded-md border text-xs leading-relaxed overflow-auto"
                            dangerouslySetInnerHTML={{ 
                              __html: templates[key]?.body?.replace(/\{(\w+)\}/g, '<span class="bg-yellow-200 px-1.5 py-0.5 rounded text-yellow-800 font-medium whitespace-nowrap">{$1}</span>') || 'No content defined'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default EmailTemplateManager;