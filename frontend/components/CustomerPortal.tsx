"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, MapPin, LogOut, Upload, X, FileText, Image, File, CheckCircle, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { playNotificationSound } from "@/lib/notification-sound";

interface CustomerData {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

// Success popup component
interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
}

function SuccessPopup({ isOpen, onClose, ticketId }: SuccessPopupProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Support Request Submitted!</h3>
            <p className="text-gray-600 mt-2">Your support request has been created successfully.</p>
            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800">Ticket ID:</p>
              <p className="text-lg font-mono font-bold text-green-900">{ticketId}</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Our support team will review your request and contact you soon via phone or email.
          </div>
          <Button 
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerPortal() {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState("");
  const router = useRouter();

  useEffect(() => {
    const customerData = localStorage.getItem("customerData");
    if (!customerData) {
      router.push("/");
      return;
    }

    try {
      const parsed = JSON.parse(customerData);
      setCustomer(parsed);
    } catch (error) {
      console.error("Error parsing customer data:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("customerToken");
      
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/customers/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      localStorage.removeItem("customerToken");
      localStorage.removeItem("customerData");
      toast.success("Logged out successfully");
      router.push("/");
    } catch (error) {
      console.error("Error during logout:", error);
      localStorage.removeItem("customerToken");
      localStorage.removeItem("customerData");
      router.push("/");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      
      // Validate file types and sizes
      const validFiles: File[] = [];
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      for (const file of newFiles) {
        if (file.size > maxSize) {
          toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
          continue;
        }
        
        if (!allowedTypes.includes(file.type)) {
          toast.error(`File "${file.name}" has an unsupported format.`);
          continue;
        }
        
        validFiles.push(file);
      }
      
      // Check total file count
      if (uploadedFiles.length + validFiles.length > 5) {
        toast.error("Maximum 5 files allowed");
        return;
      }
      
      setUploadedFiles((prev) => [...prev, ...validFiles]);
      
      if (validFiles.length > 0) {
        toast.success(`${validFiles.length} file(s) added successfully`);
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitSupport = async () => {
    if (!supportMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
      const token = localStorage.getItem("customerToken");
      let uploadedDocuments: any[] = [];

      // Upload files first if any
      if (uploadedFiles.length > 0) {
        setUploadProgress(25);
        toast.info("Uploading files...");
        
        const formData = new FormData();
        uploadedFiles.forEach(file => {
          formData.append('documents', file);
        });

        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/customer-support/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Failed to upload files");
        }

        const uploadData = await uploadResponse.json();
        uploadedDocuments = uploadData.files || [];
        setUploadProgress(75);
        toast.success("Files uploaded successfully");
      }

      // Submit support request with uploaded file information
      setUploadProgress(90);
      toast.info("Submitting support request...");
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/customer-support/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: supportMessage,
          documents: uploadedDocuments
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit support request");
      }

      const result = await response.json();
      setUploadProgress(100);
      
      // Show success popup with ticket ID
      if (result.ticketId) {
        setCreatedTicketId(result.ticketId);
        setShowSuccessPopup(true);
        // Play notification sound
        playNotificationSound();
      }
      
      toast.success("Support request submitted successfully! Our team will contact you soon.");
      setSupportMessage("");
      setUploadedFiles([]);
      setIsSupportDialogOpen(false);
    } catch (error) {
      console.error("Error submitting support request:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit support request");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessPopup(false);
    setCreatedTicketId("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Customer Portal</h1>
                <p className="text-sm text-gray-500">{customer.customerId}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {customer.name}!</CardTitle>
              <CardDescription>
                Your customer portal dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Customer ID</p>
                      <p className="font-medium">{customer.customerId}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{customer.name}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{customer.phone}</p>
                    </div>
                  </div>
                  {customer.email && (
                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{customer.email}</p>
                      </div>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">{customer.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Access your services and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                  <User className="w-6 h-6 mb-2" />
                  <span>My Profile</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => setIsSupportDialogOpen(true)}
                >
                  <Phone className="w-6 h-6 mb-2" />
                  <span>Support</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Welcome to your customer portal. Here you can manage your account,
                view your information, and access support services.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Support Dialog */}
      <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Submit Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and attach any relevant documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Describe your issue or question..."
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documents">Attach Documents (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  id="documents"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="documents"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PDF, PNG, JPG up to 10MB
                  </span>
                </label>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file, index) => {
                    const getFileIcon = (fileType: string) => {
                      if (fileType.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />;
                      if (fileType === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
                      return <File className="w-4 h-4 text-gray-500" />;
                    };
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          {getFileIcon(file.type)}
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                          disabled={isSubmitting}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {isSubmitting && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSupportDialogOpen(false);
                setSupportMessage("");
                setUploadedFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitSupport}
              disabled={isSubmitting || !supportMessage.trim()}
            >
              {isSubmitting ? "Submitting..." : "Submit Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Popup */}
      <SuccessPopup 
        isOpen={showSuccessPopup}
        onClose={handleSuccessClose}
        ticketId={createdTicketId}
      />
    </div>
  );
}
