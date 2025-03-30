import { useEffect, useState } from "react";
import { ImageSearch } from "@/components/ImageSearch";
import { ImageUpload } from "@/components/ImageUpload";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();
      if (authError) throw authError;
      setIsAuthenticated(!!session);
    } catch (err) {
      setError(
        "Failed to check authentication status. Please ensure Supabase is properly connected."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: "demo@example.com",
        password: "demo123!",
      });
      console.log("supabase auth data", data);

      if (signInError) {
        if (signInError.message === "Invalid login credentials") {
          // If login fails, try setting up the demo user first
          await setupDemoUser();
          // Try signing in again
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: "demo@example.com",
            password: "demo123!",
          });
          if (retryError) throw retryError;
        } else {
          throw signInError;
        }
      }

      await checkAuth();
      toast({
        title: "Success",
        description: "Signed in successfully",
      });
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Failed to sign in. Please try again.");
      toast({
        title: "Error",
        description: "Failed to sign in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const setupDemoUser = async () => {
    try {
      setIsSettingUp(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-demo-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create demo user");
      }

      const data = await response.json();
      toast({
        title: "Success",
        description: data.message,
      });
      return data;
    } catch (err) {
      console.error("Setup demo user error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to set up demo user";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setIsSettingUp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()}>Retry</Button>
            <Button onClick={setupDemoUser} disabled={isSettingUp} variant="outline">
              {isSettingUp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Setup Demo User"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to Image Search</h1>
          <p className="text-muted-foreground mb-8">Please sign in to continue</p>
          <div className="space-x-4">
            <Button onClick={handleSignIn}>Sign In</Button>
            <Button onClick={setupDemoUser} disabled={isSettingUp} variant="outline">
              {isSettingUp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Setup Demo User"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto py-4">
          <h1 className="text-2xl font-bold">Image Search System</h1>
        </div>
      </header>
      <main className="container mx-auto py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Search
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>
          <TabsContent value="search" className="space-y-4">
            <ImageSearch />
          </TabsContent>
          <TabsContent value="upload" className="space-y-4">
            <ImageUpload onUploadComplete={() => setActiveTab("search")} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
