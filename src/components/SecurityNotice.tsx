import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

export const SecurityNotice = () => {
  return (
    <Alert className="border-muted bg-muted/20 mb-4">
      <Shield className="h-4 w-4" />
      <AlertDescription>
        This application displays movie information from The Movie Database (TMDB). 
        Content is provided for informational purposes only. Please respect copyright 
        laws and use legitimate streaming services for watching movies.
      </AlertDescription>
    </Alert>
  );
};