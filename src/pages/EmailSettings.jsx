import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Save, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";
// import ReactQuill from 'react-quill';
// import 'react-quill/dist/quill.snow.css';
import { Textarea } from "@/components/ui/textarea";
import { getApiConfig } from '@/config/api.js';

const API_CONFIG = getApiConfig();

export default function EmailSettings() {
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState('lab_received');
  const [currentTemplate, setCurrentTemplate] = useState({ subject: '', body: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  const templateTypes = [
    {
      id: 'lab_received',
      name: 'Lab Received Email', 
      description: 'Sent when lab samples are received'
    },
    {
      id: 'report_ready',
      name: 'Report Ready Email',
      description: 'Sent when mold analysis report is ready'
    },
    {
      id: 'review_request',
      name: 'Review Request Email',
      description: 'Sent to request customer feedback'
    }
  ];

  const placeholderVariables = [
    '{{client_name}}',
    '{{inspection_number}}',
    '{{property_address}}',
    '{{received_date}}',
    '{{report_date}}',
    '{{report_link}}',
    '{{review_link}}'
  ];

  // Rich text editor configuration (temporarily disabled)
  // const quillModules = {
  //   toolbar: [
  //     [{ 'header': [1, 2, 3, false] }],
  //     ['bold', 'italic', 'underline', 'strike'],
  //     [{ 'color': [] }, { 'background': [] }],
  //     [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  //     [{ 'align': [] }],
  //     ['link'],
  //     ['clean']
  //   ],
  // };

  // const quillFormats = [
  //   'header', 'bold', 'italic', 'underline', 'strike',
  //   'color', 'background', 'list', 'bullet', 'align', 'link'
  // ];

  useEffect(() => {
    loadEmailTemplates();
  }, []);

  useEffect(() => {
    if (templates[activeTemplate]) {
      setCurrentTemplate(templates[activeTemplate]);
    }
  }, [activeTemplate, templates]);

  const loadEmailTemplates = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/email-templates`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert array to object keyed by type
      const templatesObj = {};
      data.templates.forEach(template => {
        templatesObj[template.type] = template;
      });
      
      setTemplates(templatesObj);
      
      // Set current template if active template exists
      if (templatesObj[activeTemplate]) {
        setCurrentTemplate(templatesObj[activeTemplate]);
      }
    } catch (error) {
      console.error('Error loading email templates:', error);
      setMessage({ type: 'error', text: 'Failed to load email templates' });
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = () => {
    const user = localStorage.getItem('mth_user');
    if (user) {
      const userData = JSON.parse(user);
      return userData.access_token;
    }
    return null;
  };

  const saveTemplate = async () => {
    try {
      setSaving(true);
      const token = getAuthToken();
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/email-templates/${activeTemplate}`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: currentTemplate.subject,
          body: currentTemplate.body
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update templates state
      setTemplates(prev => ({
        ...prev,
        [activeTemplate]: data.template
      }));
      
      setMessage({ type: 'success', text: 'Template saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage({ type: 'error', text: 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  const resetTemplate = async () => {
    if (!confirm('Are you sure you want to reset this template to its default content? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      const token = getAuthToken();
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/email-templates/${activeTemplate}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update templates state and current template
      setTemplates(prev => ({
        ...prev,
        [activeTemplate]: data.template
      }));
      
      setCurrentTemplate(data.template);
      
      setMessage({ type: 'success', text: 'Template reset to default successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error resetting template:', error);
      setMessage({ type: 'error', text: 'Failed to reset template' });
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (placeholder) => {
    // Insert placeholder at cursor position in subject field if focused
    const subjectInput = document.querySelector('input[name="subject"]');
    if (document.activeElement === subjectInput) {
      const cursorPos = subjectInput.selectionStart;
      const newSubject = currentTemplate.subject.slice(0, cursorPos) + 
                        placeholder + 
                        currentTemplate.subject.slice(cursorPos);
      setCurrentTemplate(prev => ({ ...prev, subject: newSubject }));
      return;
    }
    
    // Insert into the textarea body field
    const bodyTextarea = document.querySelector('#body');
    if (bodyTextarea) {
      const cursorPos = bodyTextarea.selectionStart;
      const newBody = currentTemplate.body.slice(0, cursorPos) + 
                     placeholder + 
                     currentTemplate.body.slice(cursorPos);
      setCurrentTemplate(prev => ({ ...prev, body: newBody }));
      
      // Keep focus and update cursor position
      setTimeout(() => {
        bodyTextarea.focus();
        bodyTextarea.setSelectionRange(cursorPos + placeholder.length, cursorPos + placeholder.length);
      }, 0);
    } else {
      // Fallback: append to end of body
      setCurrentTemplate(prev => ({ 
        ...prev, 
        body: (prev.body || '') + placeholder 
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const activeTemplateInfo = templateTypes.find(t => t.id === activeTemplate);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Mail className="w-8 h-8 text-blue-600" />
            Email Settings
          </h1>
          <p className="text-gray-600">
            Manage email templates for different automated communications
          </p>
        </div>

        {message.text && (
          <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <div className="flex items-center gap-2">
              {message.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
              <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                {message.text}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Template Selection Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Email Templates</CardTitle>
                <CardDescription>
                  Select a template to edit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {templateTypes.map((template) => (
                  <Button
                    key={template.id}
                    variant={activeTemplate === template.id ? "default" : "outline"}
                    className="w-full justify-start h-auto p-3"
                    onClick={() => setActiveTemplate(template.id)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {template.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Placeholder Variables */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Available Variables</CardTitle>
                <CardDescription>
                  Click to insert into template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {placeholderVariables.map((variable) => (
                    <Badge
                      key={variable}
                      variant="secondary"
                      className="cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors"
                      onClick={() => insertPlaceholder(variable)}
                    >
                      {variable}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Template Editor */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Edit {activeTemplateInfo?.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetTemplate}
                      disabled={saving}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset to Default
                    </Button>
                    <Button
                      onClick={saveTemplate}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      Save Template
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {activeTemplateInfo?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Subject Field */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={currentTemplate.subject || ''}
                    onChange={(e) => setCurrentTemplate(prev => ({
                      ...prev,
                      subject: e.target.value
                    }))}
                    placeholder="Enter email subject..."
                    className="font-medium"
                  />
                </div>

                {/* Body Field */}
                <div className="space-y-2">
                  <Label htmlFor="body">Email Body</Label>
                  <Textarea
                    id="body"
                    value={currentTemplate.body || ''}
                    onChange={(e) => setCurrentTemplate(prev => ({
                      ...prev,
                      body: e.target.value
                    }))}
                    placeholder="Enter email body content (HTML supported)..."
                    className="min-h-[300px] font-mono text-sm"
                    rows={15}
                  />
                  <p className="text-sm text-gray-500">
                    💡 You can use HTML tags for formatting (e.g., &lt;p&gt;, &lt;strong&gt;, &lt;a&gt;)
                  </p>
                </div>

                {/* Preview Section */}
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="border rounded-md p-4 bg-gray-50 max-h-96 overflow-y-auto">
                    <div className="bg-white p-4 rounded shadow">
                      <div className="border-b pb-2 mb-4">
                        <strong>Subject:</strong> {currentTemplate.subject}
                      </div>
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: currentTemplate.body }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 