import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Shield, LogIn, Lock, Eye, EyeOff, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import ReCAPTCHA from "react-google-recaptcha";

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Check if we're in local development
  const isLocalDevelopment = import.meta.env.DEV || !import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  const [captchaVerified, setCaptchaVerified] = useState(isLocalDevelopment);
  const [captchaToken, setCaptchaToken] = useState<string | null>(isLocalDevelopment ? 'localhost-bypass' : null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData & { captchaToken: string }) => {
      setIsLoading(true);
      console.log("Making login request with data:", { ...data, password: '[REDACTED]' });
      const response = await apiRequest("POST", "/api/login", data);
      const result = await response.json();
      console.log("Login response:", result);
      return result;
    },
    onSuccess: (data) => {
      setIsLoading(false);
      console.log("Login successful:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Login successful",
      });
      // Small delay to ensure the query cache is updated
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    },
    onError: (error: any) => {
      setIsLoading(false);
      console.error("Login error:", error);
      
      // Parse error message from the thrown error
      let title = "Login Failed";
      let description = "Invalid username or password";
      
      const errorMessage = error.message || "";
      console.log("Error message:", errorMessage);
      
      if (errorMessage.includes("401:")) {
        description = "Invalid username or password";
      } else {
        description = "Login failed. Please try again.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: LoginFormData) => {
    // Skip CAPTCHA verification for local development
    if (!isLocalDevelopment && (!captchaVerified || !captchaToken)) {
      toast({
        title: "Verification Required",
        description: "Please complete the CAPTCHA verification",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate({ ...data, captchaToken: captchaToken || 'localhost-bypass' });
  };

  const onCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
    setCaptchaVerified(!!token);
  };

  return (
    <div className="page-container flex items-center justify-center">
      <div className="w-full max-w-md relative">
        <div className="modern-card p-10 relative">
          {/* Logo and Header Section */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 gradient-blue rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Sudhamrit
            </h1>
            <p className="text-gray-600 text-base">Inventory Management System</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Username Field */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block mb-2 text-gray-800 font-semibold text-sm">
                      Username, Email, or Mobile Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter username, email, or mobile number"
                        className="form-field"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block mb-2 text-gray-800 font-semibold text-sm">
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="form-field pr-12"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-500 transition-colors p-1"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <div className="text-right mt-2">
                      <button
                        type="button"
                        className="text-indigo-500 hover:text-indigo-600 text-sm font-medium transition-colors hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-3 mb-8">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <label
                    htmlFor="rememberMe"
                    className={`w-5 h-5 border-2 rounded cursor-pointer flex items-center justify-center transition-all ${
                      rememberMe 
                        ? 'bg-indigo-500 border-indigo-500' 
                        : 'border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {rememberMe && <span className="text-white text-xs">✓</span>}
                  </label>
                </div>
                <label htmlFor="rememberMe" className="text-gray-700 text-sm cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>

              {/* CAPTCHA - Only show in production */}
              {!isLocalDevelopment && (
                <div className="flex justify-center mb-6">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                    onChange={onCaptchaChange}
                    theme="light"
                  />
                </div>
              )}
              
              {/* Local development notice */}
              {isLocalDevelopment && (
                <div className="flex justify-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                  <p className="text-sm text-yellow-800 font-medium">
                    🔧 Local Development Mode - CAPTCHA disabled
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit"
                className="btn-primary w-full"
                disabled={isLoading || (!isLocalDevelopment && !captchaVerified)}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In to Dashboard"
                )}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <span className="relative bg-white px-6 text-gray-500 text-sm">Need Help?</span>
          </div>

          {/* Footer Links */}
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-3">
              Don't have an account?{" "}
              <Link href="/register">
                <button className="text-indigo-500 hover:text-indigo-600 font-medium hover:underline transition-colors">
                  Create Account
                </button>
              </Link>
            </p>
         
          </div>
        </div>
      </div>
    </div>
  );
}
