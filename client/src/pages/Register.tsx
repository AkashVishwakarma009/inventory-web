import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Link } from "wouter";
import ReCAPTCHA from "react-google-recaptcha";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff, UserPlus } from "lucide-react";

const registrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  countryCode: z.string().min(1, "Please select a country code"),
  mobileNumber: z.string().min(6, "Mobile number must be at least 6 digits").regex(/^\d+$/, "Mobile number must contain only digits"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function Register() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if we're in local development
  const isLocalDevelopment = import.meta.env.DEV || !import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  const [captchaVerified, setCaptchaVerified] = useState(isLocalDevelopment);
  const [captchaToken, setCaptchaToken] = useState<string | null>(isLocalDevelopment ? 'localhost-bypass' : null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      countryCode: "+91", // Default to India
      mobileNumber: "",
      password: "",
      confirmPassword: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationFormData & { captchaToken: string }) => {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/register", {
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        countryCode: data.countryCode,
        mobileNumber: data.mobileNumber,
        password: data.password,
        captchaToken: data.captchaToken,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful!",
        description: "Your account has been created. Please wait for an admin to assign your role before you can log in.",
      });
      form.reset();
      setIsLoading(false);
      // Redirect to login page after successful registration
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    },
    onError: (error: any) => {
      setIsLoading(false);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: RegistrationFormData) => {
    // Skip CAPTCHA verification for local development
    if (!isLocalDevelopment && (!captchaVerified || !captchaToken)) {
      toast({
        title: "Verification Required",
        description: "Please complete the CAPTCHA verification",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate({ ...data, captchaToken: captchaToken || 'localhost-bypass' });
  };

  const onCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
    setCaptchaVerified(!!token);
  };

  return (
    <div className="page-container flex items-center justify-center">
      <div className="w-full max-w-md relative">
        <div className="modern-card p-6 sm:p-8 relative">
          {/* Logo and Header Section */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 gradient-blue rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
              <UserPlus className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Create Account
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">Join Sudhamrit Inventory Management</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block mb-2 text-gray-800 font-semibold text-sm">
                        First Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="First name"
                          className="form-field"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block mb-2 text-gray-800 font-semibold text-sm">
                        Last Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Last name"
                          className="form-field"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Username Field */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block mb-2 text-gray-800 font-semibold text-sm">
                      Username
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your username"
                        className="form-field"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block mb-2 text-gray-800 font-semibold text-sm">
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        className="form-field"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mobile Number Field */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="countryCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block mb-2 text-gray-800 font-semibold text-sm">
                        Country
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="form-field">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="+93">🇦🇫 Afghanistan (+93)</SelectItem>
                          <SelectItem value="+355">🇦🇱 Albania (+355)</SelectItem>
                          <SelectItem value="+213">🇩🇿 Algeria (+213)</SelectItem>
                          <SelectItem value="+1-us">🇺🇸 United States (+1)</SelectItem>
                          <SelectItem value="+54">🇦🇷 Argentina (+54)</SelectItem>
                          <SelectItem value="+374">🇦🇲 Armenia (+374)</SelectItem>
                          <SelectItem value="+61">🇦🇺 Australia (+61)</SelectItem>
                          <SelectItem value="+43">🇦🇹 Austria (+43)</SelectItem>
                          <SelectItem value="+994">🇦🇿 Azerbaijan (+994)</SelectItem>
                          <SelectItem value="+973">🇧🇭 Bahrain (+973)</SelectItem>
                          <SelectItem value="+880">🇧🇩 Bangladesh (+880)</SelectItem>
                          <SelectItem value="+375">🇧🇾 Belarus (+375)</SelectItem>
                          <SelectItem value="+32">🇧🇪 Belgium (+32)</SelectItem>
                          <SelectItem value="+55">🇧🇷 Brazil (+55)</SelectItem>
                          <SelectItem value="+359">🇧🇬 Bulgaria (+359)</SelectItem>
                          <SelectItem value="+1-ca">🇨🇦 Canada (+1)</SelectItem>
                          <SelectItem value="+56">🇨🇱 Chile (+56)</SelectItem>
                          <SelectItem value="+86">🇨🇳 China (+86)</SelectItem>
                          <SelectItem value="+57">🇨🇴 Colombia (+57)</SelectItem>
                          <SelectItem value="+385">🇭🇷 Croatia (+385)</SelectItem>
                          <SelectItem value="+420">🇨🇿 Czech Republic (+420)</SelectItem>
                          <SelectItem value="+45">🇩🇰 Denmark (+45)</SelectItem>
                          <SelectItem value="+20">🇪🇬 Egypt (+20)</SelectItem>
                          <SelectItem value="+372">🇪🇪 Estonia (+372)</SelectItem>
                          <SelectItem value="+358">🇫🇮 Finland (+358)</SelectItem>
                          <SelectItem value="+33">🇫🇷 France (+33)</SelectItem>
                          <SelectItem value="+995">🇬🇪 Georgia (+995)</SelectItem>
                          <SelectItem value="+49">🇩🇪 Germany (+49)</SelectItem>
                          <SelectItem value="+30">🇬🇷 Greece (+30)</SelectItem>
                          <SelectItem value="+852">🇭🇰 Hong Kong (+852)</SelectItem>
                          <SelectItem value="+36">🇭🇺 Hungary (+36)</SelectItem>
                          <SelectItem value="+354">🇮🇸 Iceland (+354)</SelectItem>
                          <SelectItem value="+91">🇮🇳 India (+91)</SelectItem>
                          <SelectItem value="+62">🇮🇩 Indonesia (+62)</SelectItem>
                          <SelectItem value="+98">🇮🇷 Iran (+98)</SelectItem>
                          <SelectItem value="+964">🇮🇶 Iraq (+964)</SelectItem>
                          <SelectItem value="+353">🇮🇪 Ireland (+353)</SelectItem>
                          <SelectItem value="+972">🇮🇱 Israel (+972)</SelectItem>
                          <SelectItem value="+39">🇮🇹 Italy (+39)</SelectItem>
                          <SelectItem value="+81">🇯🇵 Japan (+81)</SelectItem>
                          <SelectItem value="+962">🇯🇴 Jordan (+962)</SelectItem>
                          <SelectItem value="+7-kz">🇰🇿 Kazakhstan (+7)</SelectItem>
                          <SelectItem value="+254">🇰🇪 Kenya (+254)</SelectItem>
                          <SelectItem value="+965">🇰🇼 Kuwait (+965)</SelectItem>
                          <SelectItem value="+996">🇰🇬 Kyrgyzstan (+996)</SelectItem>
                          <SelectItem value="+371">🇱🇻 Latvia (+371)</SelectItem>
                          <SelectItem value="+961">🇱🇧 Lebanon (+961)</SelectItem>
                          <SelectItem value="+370">🇱🇹 Lithuania (+370)</SelectItem>
                          <SelectItem value="+352">🇱🇺 Luxembourg (+352)</SelectItem>
                          <SelectItem value="+853">🇲🇴 Macau (+853)</SelectItem>
                          <SelectItem value="+60">🇲🇾 Malaysia (+60)</SelectItem>
                          <SelectItem value="+356">🇲🇹 Malta (+356)</SelectItem>
                          <SelectItem value="+52">🇲🇽 Mexico (+52)</SelectItem>
                          <SelectItem value="+373">🇲🇩 Moldova (+373)</SelectItem>
                          <SelectItem value="+377">🇲🇨 Monaco (+377)</SelectItem>
                          <SelectItem value="+976">🇲🇳 Mongolia (+976)</SelectItem>
                          <SelectItem value="+212">🇲🇦 Morocco (+212)</SelectItem>
                          <SelectItem value="+977">🇳🇵 Nepal (+977)</SelectItem>
                          <SelectItem value="+31">🇳🇱 Netherlands (+31)</SelectItem>
                          <SelectItem value="+64">🇳🇿 New Zealand (+64)</SelectItem>
                          <SelectItem value="+234">🇳🇬 Nigeria (+234)</SelectItem>
                          <SelectItem value="+47">🇳🇴 Norway (+47)</SelectItem>
                          <SelectItem value="+968">🇴🇲 Oman (+968)</SelectItem>
                          <SelectItem value="+92">🇵🇰 Pakistan (+92)</SelectItem>
                          <SelectItem value="+51">🇵🇪 Peru (+51)</SelectItem>
                          <SelectItem value="+63">🇵🇭 Philippines (+63)</SelectItem>
                          <SelectItem value="+48">🇵🇱 Poland (+48)</SelectItem>
                          <SelectItem value="+351">🇵🇹 Portugal (+351)</SelectItem>
                          <SelectItem value="+974">🇶🇦 Qatar (+974)</SelectItem>
                          <SelectItem value="+40">🇷🇴 Romania (+40)</SelectItem>
                          <SelectItem value="+7-ru">🇷🇺 Russia (+7)</SelectItem>
                          <SelectItem value="+966">🇸🇦 Saudi Arabia (+966)</SelectItem>
                          <SelectItem value="+381">🇷🇸 Serbia (+381)</SelectItem>
                          <SelectItem value="+65">🇸🇬 Singapore (+65)</SelectItem>
                          <SelectItem value="+421">🇸🇰 Slovakia (+421)</SelectItem>
                          <SelectItem value="+386">🇸🇮 Slovenia (+386)</SelectItem>
                          <SelectItem value="+27">🇿🇦 South Africa (+27)</SelectItem>
                          <SelectItem value="+82">🇰🇷 South Korea (+82)</SelectItem>
                          <SelectItem value="+34">🇪🇸 Spain (+34)</SelectItem>
                          <SelectItem value="+94">🇱🇰 Sri Lanka (+94)</SelectItem>
                          <SelectItem value="+46">🇸🇪 Sweden (+46)</SelectItem>
                          <SelectItem value="+41">🇨🇭 Switzerland (+41)</SelectItem>
                          <SelectItem value="+886">🇹🇼 Taiwan (+886)</SelectItem>
                          <SelectItem value="+992">🇹🇯 Tajikistan (+992)</SelectItem>
                          <SelectItem value="+66">🇹🇭 Thailand (+66)</SelectItem>
                          <SelectItem value="+90">🇹🇷 Turkey (+90)</SelectItem>
                          <SelectItem value="+993">🇹🇲 Turkmenistan (+993)</SelectItem>
                          <SelectItem value="+380">🇺🇦 Ukraine (+380)</SelectItem>
                          <SelectItem value="+971">🇦🇪 UAE (+971)</SelectItem>
                          <SelectItem value="+44">🇬🇧 United Kingdom (+44)</SelectItem>
                          <SelectItem value="+998">🇺🇿 Uzbekistan (+998)</SelectItem>
                          <SelectItem value="+84">🇻🇳 Vietnam (+84)</SelectItem>
                          <SelectItem value="+967">🇾🇪 Yemen (+967)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block mb-2 text-gray-800 font-semibold text-sm">
                          Mobile Number
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="Enter mobile number"
                            className="form-field"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm Password Field */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block mb-2 text-gray-800 font-semibold text-sm">
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          className="form-field pr-12"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-500 transition-colors p-1"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    Creating Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <span className="relative bg-white px-6 text-gray-500 text-sm">Already have an account?</span>
          </div>

          {/* Footer Links */}
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-3">
              <Link href="/login">
                <button className="text-indigo-500 hover:text-indigo-600 font-medium hover:underline transition-colors">
                  Sign In Instead
                </button>
              </Link>
            </p>
            {/* <p className="text-sm">
              <button className="text-indigo-500 hover:text-indigo-600 hover:underline transition-colors">
                Technical Support
              </button>
              {" | "}
              <button className="text-indigo-500 hover:text-indigo-600 hover:underline transition-colors">
                User Guide
              </button>
            </p> */}
          </div>
        </div>
      </div>
    </div>
  );
}
