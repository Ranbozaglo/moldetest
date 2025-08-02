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
import { Save, RefreshCw, Eye, Mail, CheckCircle, AlertTriangle, FlaskConical } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { EmailService } from "@/api/entities";

const EmailTemplateManager = () => {
  const [templates, setTemplates] = useState({
    lab_received: {
      subject: "Total Testing - Lab Samples Received (Inspection #{inspection_number})",
      body: `<html>
<body>
    <h2>Total Testing - Lab Samples Received</h2>
    <p>Dear {full_name},</p>
    <p>We have received your mold testing samples for inspection #{inspection_number}.</p>
    <p>Our laboratory is now processing your samples and will provide results within 3-5 business days.</p>
    <p>We will notify you as soon as your report is ready.</p>
    <p>Thank you for choosing Total Testing.</p>
    <br>
    <p>Best regards,<br>Total Testing Team</p>
</body>
</html>`
    },
    report_ready: {
      subject: "Total Testing - Report Ready (Inspection #{inspection_number})",
      body: `<html>
<body>
    <h2>Total Testing - Report Ready</h2>
    <p>Dear {full_name},</p>
    <p>Your Total Testing report for inspection #{inspection_number} is now ready.</p>
    <p>You can download your report from your account dashboard.</p>
    <p>If you have any questions about your results, please don't hesitate to contact us.</p>
    <p>Thank you for choosing Total Testing.</p>
    <br>
    <p>Best regards,<br>Total Testing Team</p>
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
    }
  };

  const availableVariables = [
    { name: '{full_name}', description: 'Customer full name' },
    { name: '{inspection_number}', description: 'Inspection number' },
    { name: '{email}', description: 'Customer email address' },
    { name: '{street_address}', description: 'Property street address' },
    { name: '{city}', description: 'Property city' },
    { name: '{state}', description: 'Property state' },
    { name: '{zip_code}', description: 'Property zip code' },
    { name: '{property_type}', description: 'Type of property' },
    { name: '{client_type}', description: 'Type of client' }
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
      toast({
        title: "Templates Saved",
        description: "Email templates have been successfully updated.",
      });
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
        <TabsList className="grid w-full grid-cols-3">
          {Object.entries(templateInfo).map(([key, info]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="flex items-center gap-2 data-[state=active]:bg-white"
            >
              <div className={`w-2 h-2 rounded-full ${info.color}`} />
              {info.icon}
              {info.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(templateInfo).map(([key, info]) => (
          <TabsContent key={key} value={key} className="space-y-6">
            <Alert>
              <info.icon.type className="w-4 h-4" />
              <AlertDescription>
                <strong>{info.title}:</strong> {info.description}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Editor */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Edit Template
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input
                        id="subject"
                        value={templates[key]?.subject || ''}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        placeholder="Enter email subject..."
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="body">Email Body (HTML)</Label>
                      <Textarea
                        id="body"
                        value={templates[key]?.body || ''}
                        onChange={(e) => handleBodyChange(e.target.value)}
                        placeholder="Enter email body HTML..."
                        className="mt-1 min-h-[400px] font-mono text-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="flex items-center gap-2"
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
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reset to Default
                      </Button>

                      {saveStatus && (
                        <div className="flex items-center gap-2">
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Available Variables</CardTitle>
                    <CardDescription className="text-xs">
                      Click to insert into template
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {availableVariables.map((variable) => (
                        <div
                          key={variable.name}
                          className="p-2 border rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => insertVariable(variable.name)}
                        >
                          <div className="font-mono text-sm text-blue-600">
                            {variable.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {variable.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Preview</CardTitle>
                    <CardDescription className="text-xs">
                      How the email will appear
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md p-3 bg-slate-50 max-h-60 overflow-y-auto">
                      <div className="text-xs font-mono">
                        <div className="font-semibold mb-2">Subject:</div>
                        <div className="mb-4 p-2 bg-white rounded border">
                          {templates[key]?.subject || ''}
                        </div>
                        <div className="font-semibold mb-2">Body:</div>
                        <div 
                          className="p-2 bg-white rounded border text-xs"
                          dangerouslySetInnerHTML={{ 
                            __html: templates[key]?.body?.replace(/\{(\w+)\}/g, '<span class="bg-yellow-200 px-1 rounded">{$1}</span>') || '' 
                          }}
                        />
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