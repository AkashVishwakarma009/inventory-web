import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Users,
  Edit,
  UserPlus,
  Key,
  Lock,
  UserX,
  UserCheck,
  Eye,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { User, getUserActiveRoles } from "@shared/schema";

// Extend UserRole type locally to include new roles
export type UserRole =
  | "super_admin"
  | "master_inventory_handler"
  | "stock_in_manager"
  | "stock_out_manager"
  | "attendance_checker"
  | "weekly_stock_planner"
  | "orders"
  | "send_message"
  | "all_reports"
  | "label_printing"
  | "storage_management";
import { Link } from "wouter";

const updateRoleSchema = z.object({
  role: z.enum([
    "super_admin",
    "master_inventory_handler",
    "stock_in_manager",
    "stock_out_manager",
    "attendance_checker",
    "weekly_stock_planner",
    "orders",
    "send_message",
    "all_reports",
    "label_printing",
    "storage_management",
  ]).optional(),
  roles: z.array(z.enum([
    "super_admin",
    "master_inventory_handler",
    "stock_in_manager",
    "stock_out_manager",
    "attendance_checker",
    "weekly_stock_planner",
    "orders",
    "send_message",
    "all_reports",
    "label_printing",
    "storage_management",
  ])).min(1, "At least one role must be selected"),
});

const updatePasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const createUserSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters long"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string(),
    email: z
      .string()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    role: z.enum([
      "super_admin",
      "master_inventory_handler",
      "stock_in_manager",
      "stock_out_manager",
      "attendance_checker",
      "weekly_stock_planner",
      "orders",
      "send_message",
      "all_reports",
      "label_printing",
      "storage_management",
    ]).optional(),
    roles: z.array(z.enum([
      "super_admin",
      "master_inventory_handler",
      "stock_in_manager",
      "stock_out_manager",
      "attendance_checker",
      "weekly_stock_planner",
      "orders",
      "send_message",
      "all_reports",
      "label_printing",
      "storage_management",
    ])).min(1, "At least one role must be selected"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type UpdateRoleFormData = z.infer<typeof updateRoleSchema>;
type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;
type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function UserManagement() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const [showDashboard, setShowDashboard] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showUsername, setShowUsername] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Only Super Admin can access user management - support multiple roles
  const userRoles = (user as any)?.roles || [(user as any)?.role].filter(Boolean);
  const hasRole = (role: string) => userRoles.includes(role);
  const hasAccess = hasRole("super_admin");

  const {
    data: users = [],
    isLoading: usersLoading,
    error,
  } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && hasAccess,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  const form = useForm<UpdateRoleFormData>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      roles: [],
    },
  });

  const passwordForm = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const createUserForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      firstName: "",
      lastName: "",
      roles: [],
    },
  });

  const updateRolesMutation = useMutation({
    mutationFn: async ({
      userId,
      roles,
    }: {
      userId: string;
      roles: UserRole[];
    }) => {
      await apiRequest("PUT", `/api/users/${userId}/roles`, { roles });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User roles updated successfully",
      });
      form.reset();
      setEditingUser(null);
    },
    onError: (error) => {
      console.error("Role update error:", error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      const errorMessage = (error as any)?.message || "Failed to update user roles";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({
      userId,
      password,
    }: {
      userId: string;
      password: string;
    }) => {
      await apiRequest("PUT", `/api/users/${userId}/password`, { password });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User password updated successfully",
      });
      passwordForm.reset();
      setPasswordUser(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user password",
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      await apiRequest("PUT", `/api/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const { confirmPassword, ...userData } = data;
      await apiRequest("POST", "/api/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      createUserForm.reset();
      setShowCreateUser(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.refetchQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      const errorMessage = error.message || "Failed to delete user";
      toast({
        title: "Cannot Delete User",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleEditRole = (user: User) => {
    setEditingUser(user);
    // Get user's current roles (either from roles array or fallback to single role)
    const activeRoles = (user.roles && Array.isArray(user.roles) && user.roles.length > 0) 
      ? user.roles 
      : (user.role ? [user.role as UserRole] : []);
    form.setValue("roles", activeRoles);
  };

  const handleUpdateRole = (data: UpdateRoleFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Editing user:", editingUser);
    
    if (editingUser && data.roles && data.roles.length > 0) {
      console.log("Attempting to update roles for user:", editingUser.id, "with roles:", data.roles);
      updateRolesMutation.mutate({
        userId: editingUser.id.toString(),
        roles: data.roles,
      });
    } else {
      toast({
        title: "Error",
        description: "Please select at least one role",
        variant: "destructive",
      });
    }
  };

  const handleEditPassword = (user: User) => {
    setPasswordUser(user);
    passwordForm.reset();
  };

  const handleUpdatePassword = (data: UpdatePasswordFormData) => {
    if (passwordUser) {
      updatePasswordMutation.mutate({
        userId: passwordUser.id.toString(),
        password: data.password,
      });
    }
  };

  const handleCreateUser = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleToggleUserStatus = (userId: number, currentStatus: boolean) => {
    toggleUserStatusMutation.mutate({
      userId: userId.toString(),
      isActive: !currentStatus,
    });
  };

  const handleDeleteUser = (user: User) => {
    if (
      window.confirm(
        `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`,
      )
    ) {
      deleteUserMutation.mutate(user.id.toString());
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don't have permission to access user management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show dashboard with button first
  if (showDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-indigo-50 to-blue-100 py-10 px-2">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Back to Home Button */}
          <div className="mb-8 sm:mb-6">
            <Link href="/">
              <Button
                variant="outline"
                className="flex items-center gap-2 min-h-[44px] no-zoom border-indigo-200 shadow hover:bg-indigo-50 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm sm:text-base">Back to Home</span>
              </Button>
            </Link>
          </div>

          <div className="text-center mb-10 mt-4 sm:mt-0">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-pink-500 to-purple-600 mb-2 drop-shadow-lg">
              User Management Dashboard
            </h1>
            <p className="text-lg sm:text-xl text-indigo-700 font-medium">Super Admin</p>
            <p className="text-sm sm:text-base text-gray-500 mt-2 px-2">
              Click the button below to manage system users
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-center">
            <div
              className="bg-gradient-to-br from-pink-100 via-rose-100 to-indigo-100 rounded-xl border border-pink-200 p-5 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer h-36"
              onClick={() => setShowDashboard(false)}
            >
              <div className="text-center h-full flex flex-col justify-center">
                <div className="mx-auto w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-pink-800 mb-1">User Management</h3>
                <p className="text-pink-600 text-xs">Manage users</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-indigo-50 to-blue-100 py-10 px-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Back button */}
        <div className="mb-8">
          <Button
            variant="outline"
            className="flex items-center gap-2 min-h-[44px] no-zoom border-indigo-200 shadow hover:bg-indigo-50 transition"
            onClick={() => setShowDashboard(true)}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm sm:text-base">Back to Home</span>
          </Button>
        </div>

        {/* Header section */}
        <div className="bg-white/90 rounded-2xl shadow-lg border border-indigo-100 p-8 mb-10">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center shadow">
                <Users className="h-6 w-6 text-pink-600" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-indigo-700">User Management</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUsername(!showUsername)}
                className="flex items-center space-x-2 min-h-[44px] lg:min-h-[48px] px-4 lg:px-6 border-indigo-200"
              >
                <Eye className="h-4 w-4" />
                <span>{showUsername ? "Hide" : "Show"} Usernames</span>
              </Button>
              <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                <DialogTrigger asChild>
                  <Button className="min-h-[44px] lg:min-h-[48px] px-4 lg:px-6 bg-pink-600 hover:bg-pink-700 text-white shadow">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add New User
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                  </DialogHeader>
                  <Form {...createUserForm}>
                    <form
                      onSubmit={createUserForm.handleSubmit(handleCreateUser)}
                      className="space-y-4"
                    >
                    <FormField
                      control={createUserForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter username" className="h-12 text-base" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={createUserForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="First name" className="h-12 text-base" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createUserForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Last name" className="h-12 text-base" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={createUserForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="email@example.com"
                              className="h-12 text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createUserForm.control}
                      name="roles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roles * (Select at least one)</FormLabel>
                          <div className="space-y-3">
                            {[
                              { value: "super_admin", label: "👑 Super Admin" },
                              { value: "master_inventory_handler", label: "🧑‍🔧 Master Inventory Handler" },
                              { value: "stock_in_manager", label: "📥 Stock In Manager" },
                              { value: "stock_out_manager", label: "📤 Stock Out Manager" },
                              { value: "attendance_checker", label: "📅 Attendance Checker" },
                              { value: "weekly_stock_planner", label: "📊 Weekly Stock Planner" },
                              { value: "orders", label: "📦 Orders" },
                              { value: "send_message", label: "✉️ Send Message" },
                              { value: "all_reports", label: "📑 All Reports" },
                              { value: "label_printing", label: "🏷️ Label Printing" },
                              { value: "storage_management", label: "📁 Storage Management" },
                            ].map((role) => (
                              <div key={role.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`create-${role.value}`}
                                  checked={field.value?.includes(role.value as UserRole) || false}
                                  onCheckedChange={(checked) => {
                                    const currentRoles = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentRoles, role.value as UserRole]);
                                    } else {
                                      field.onChange(currentRoles.filter(r => r !== role.value));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`create-${role.value}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {role.label}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createUserForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter password"
                              className="h-12 text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createUserForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password *</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm password"
                              className="h-12 text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateUser(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending
                          ? "Creating..."
                          : "Create User"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Card className="shadow-xl border-0 bg-white/95">
        <CardHeader className="bg-white border-b border-indigo-100 px-6 py-4">
          <CardTitle className="text-xl lg:text-2xl font-bold text-indigo-700 flex items-center gap-2">
            <Users className="h-5 w-5 lg:h-6 lg:w-6 text-pink-600" />
            System Users
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b bg-indigo-50/50">
                    <th className="text-left p-3 font-semibold text-indigo-700 text-xs sm:text-sm lg:text-base">User ID</th>
                    {showUsername && (
                      <th className="text-left p-3 font-semibold text-indigo-700 text-xs sm:text-sm lg:text-base">Username</th>
                    )}
                    <th className="text-left p-3 font-semibold text-indigo-700 text-xs sm:text-sm lg:text-base">Email</th>
                    <th className="text-left p-3 font-semibold text-indigo-700 text-xs sm:text-sm lg:text-base">Name</th>
                    <th className="text-left p-3 font-semibold text-indigo-700 text-xs sm:text-sm lg:text-base">Role</th>
                    <th className="text-left p-3 font-semibold text-indigo-700 text-xs sm:text-sm lg:text-base">Status</th>
                    <th className="text-left p-3 font-semibold text-indigo-700 text-xs sm:text-sm lg:text-base">Created</th>
                    <th className="text-left p-3 font-semibold text-indigo-700 text-xs sm:text-sm lg:text-base">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(users as User[])?.map((userItem: User) => {
                    const needsApproval = (!userItem.roles || userItem.roles.length === 0);
                    return (
                      <tr
                        key={userItem.id}
                        className={`border-b border-indigo-100 hover:bg-pink-50/60 transition-colors ${
                          needsApproval ? 'bg-yellow-50 hover:bg-yellow-100' : ''
                        }`}
                      >
                        <td className="p-3 font-mono text-xs sm:text-sm lg:text-base text-gray-600">
                          <div className="flex items-center gap-2">
                            {needsApproval && (
                              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Needs role approval"></div>
                            )}
                            <span className="truncate">{userItem.id}</span>
                          </div>
                        </td>
                        {showUsername && (
                          <td className="p-3 font-medium text-xs sm:text-sm lg:text-base text-gray-900">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{userItem.username}</span>
                              {needsApproval && (
                                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                                  NEW
                                </Badge>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="p-3 text-xs sm:text-sm lg:text-base text-gray-700">
                          <span className="truncate block max-w-[160px]">{userItem.email}</span>
                        </td>
                        <td className="p-3 text-xs sm:text-sm lg:text-base text-gray-700">
                          <span className="truncate block max-w-[120px]">
                            {userItem.firstName || userItem.lastName
                              ? `${userItem.firstName || ""} ${userItem.lastName || ""}`.trim()
                              : "N/A"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {needsApproval ? (
                              <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300 animate-pulse">
                                ⚠️ Awaiting Role Assignment
                              </Badge>
                            ) : (
                              ((userItem.roles && Array.isArray(userItem.roles) && userItem.roles.length > 0)
                                ? userItem.roles
                                : [userItem.role as UserRole]
                              ).map((role: UserRole) => (
                                <Badge key={role} className={getRoleBadgeColor(role)} style={{ fontSize: '0.7rem' }}>
                                  {getRoleDisplayName(role)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={userItem.isActive ? "default" : "secondary"}
                            className="text-xs lg:text-sm"
                          >
                            {userItem.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm lg:text-base text-gray-600">
                          {userItem.createdAt
                            ? formatDate(userItem.createdAt.toString())
                            : "N/A"}
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-1 lg:space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRole(userItem)}
                              disabled={userItem.id === (user as any)?.id}
                              title="Edit Role"
                              className="h-8 w-8 lg:h-9 lg:w-9 p-0 border-indigo-200"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPassword(userItem)}
                              title="Change Password"
                              className="h-8 w-8 lg:h-9 lg:w-9 p-0 border-indigo-200"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleToggleUserStatus(
                                  userItem.id,
                                  Boolean(userItem.isActive),
                                )
                              }
                              disabled={userItem.id === (user as any)?.id}
                              title={
                                userItem.isActive
                                  ? "Deactivate User"
                                  : "Activate User"
                              }
                              className="h-8 w-8 lg:h-9 lg:w-9 p-0 border-indigo-200"
                            >
                              {userItem.isActive ? (
                                <UserX className="h-4 w-4 text-red-600" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(userItem)}
                              disabled={userItem.id === (user as any)?.id}
                              title="Delete User"
                              className="h-8 w-8 lg:h-9 lg:w-9 p-0 border-indigo-200"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              {(users as User[])?.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-400">No users found</p>
                  <p className="text-sm text-gray-400 mt-1">Get started by creating your first user</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update User Roles</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleUpdateRole)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles (Select multiple)</FormLabel>
                    <div className="space-y-3">
                      {[
                        { value: "super_admin", label: "👑 Super Admin" },
                        { value: "master_inventory_handler", label: "🧑‍🔧 Master Inventory Handler" },
                        { value: "stock_in_manager", label: "📥 Stock In Manager" },
                        { value: "stock_out_manager", label: "📤 Stock Out Manager" },
                        { value: "attendance_checker", label: "📅 Attendance Checker" },
                        { value: "weekly_stock_planner", label: "📊 Weekly Stock Planner" },
                        { value: "orders", label: "📦 Orders" },
                        { value: "send_message", label: "✉️ Send Message" },
                        { value: "all_reports", label: "📑 All Reports" },
                        { value: "label_printing", label: "🏷️ Label Printing" },
                        { value: "storage_management", label: "📁 Storage Management" },
                      ].map((role) => (
                        <div key={role.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={role.value}
                            checked={field.value?.includes(role.value as UserRole) || false}
                            onCheckedChange={(checked) => {
                              const currentRoles = field.value || [];
                              if (checked) {
                                field.onChange([...currentRoles, role.value as UserRole]);
                              } else {
                                field.onChange(currentRoles.filter((r: UserRole) => r !== role.value));
                              }
                            }}
                          />
                          <label
                            htmlFor={role.value}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {role.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateRolesMutation.isPending}>
                  {updateRolesMutation.isPending ? "Updating..." : "Update Roles"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Password Dialog */}
      <Dialog open={!!passwordUser} onOpenChange={() => setPasswordUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Password</DialogTitle>
          </DialogHeader>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(handleUpdatePassword)}
              className="space-y-4"
            >
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatePasswordMutation.isPending}
                >
                  {updatePasswordMutation.isPending
                    ? "Updating..."
                    : "Update Password"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

// Helper functions for displaying role names and badge colors
function getRoleDisplayName(role: string): string {
  switch (role) {
    case "super_admin":
      return "👑 Super Admin";
    case "master_inventory_handler":
      return "🧑‍🔧 Master Inventory Handler";
    case "stock_in_manager":
      return "📥 Stock In Manager";
    case "stock_out_manager":
      return "📤 Stock Out Manager";
    case "attendance_checker":
      return "📅 Attendance Checker";
    case "weekly_stock_planner":
      return "📊 Weekly Stock Planner";
    case "orders":
      return "📦 Orders";
    case "send_message":
      return "✉️ Send Message";
    case "all_reports":
      return "📑 All Reports";
    case "label_printing":
      return "🏷️ Label Printing";
    case "storage_management":
      return "📁 Storage Management";
    default:
      return role;
  }
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "super_admin":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "master_inventory_handler":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "stock_in_manager":
      return "bg-green-100 text-green-800 border-green-200";
    case "stock_out_manager":
      return "bg-orange-100 text-orange-800 border-orange-200";
     case "attendance_checker":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "weekly_stock_planner":
      return "bg-pink-100 text-pink-800 border-pink-200"; // <-- Add here
    case "label_printing":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "storage_management":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString();
}
