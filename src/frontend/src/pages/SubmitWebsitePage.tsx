import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Globe, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useSubmitWebsite } from "../hooks/useQueries";
import {
  sanitizeText,
  validateDescription,
  validateKeywords,
  validateTitle,
  validateUrl,
} from "../utils/security";

export default function SubmitWebsitePage() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { identity } = useInternetIdentity();
  const submitMutation = useSubmitWebsite();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUrl = sanitizeText(url);
    const cleanTitle = sanitizeText(title);
    const cleanDesc = sanitizeText(description);
    const cleanKw = sanitizeText(keywords);

    const urlErr = validateUrl(cleanUrl);
    if (urlErr) {
      toast.error(urlErr);
      return;
    }
    const titleErr = validateTitle(cleanTitle);
    if (titleErr) {
      toast.error(titleErr);
      return;
    }
    const descErr = validateDescription(cleanDesc);
    if (descErr) {
      toast.error(descErr);
      return;
    }
    const kwErr = validateKeywords(cleanKw);
    if (kwErr) {
      toast.error(kwErr);
      return;
    }

    try {
      await submitMutation.mutateAsync({
        url: cleanUrl,
        title: cleanTitle,
        description: cleanDesc,
        keywords: cleanKw
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Submission failed. Please try again.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 text-[#374151] hover:text-[#111827] transition-colors"
          data-ocid="submit.back.link"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Aflino</span>
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          <Globe className="h-5 w-5 text-[#006AFF]" />
          <span className="font-semibold text-[#111827] text-sm">aflino</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {submitted ? (
          <div
            className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-10 max-w-lg w-full text-center"
            data-ocid="submit.success_state"
          >
            <CheckCircle2 className="h-14 w-14 text-[#006AFF] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#111827] mb-2">
              Submission Received!
            </h2>
            <p className="text-[#6B7280] text-sm mb-6">
              Your site has been submitted! We&apos;ll review it shortly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => {
                  setSubmitted(false);
                  setUrl("");
                  setTitle("");
                  setDescription("");
                  setKeywords("");
                }}
                variant="outline"
                className="border-[#006AFF] text-[#006AFF] hover:bg-[#006AFF] hover:text-white transition-colors"
                data-ocid="submit.another.button"
              >
                Submit Another
              </Button>
              <Link to="/">
                <Button
                  className="bg-[#006AFF] hover:bg-[#0052CC] text-white w-full sm:w-auto"
                  data-ocid="submit.home.button"
                >
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 max-w-lg w-full">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#111827] mb-1">
                Submit Your Website
              </h1>
              <p className="text-sm text-[#6B7280]">
                Add your site to Aflino&apos;s curated index.
                {!identity && (
                  <>
                    {" "}
                    <Link
                      to="/register"
                      className="text-[#006AFF] hover:underline"
                    >
                      Sign in
                    </Link>{" "}
                    to track your submissions.
                  </>
                )}
              </p>
            </div>

            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="space-y-5"
              data-ocid="submit.form"
            >
              {/* URL */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="submit-url"
                  className="text-sm font-medium text-[#374151]"
                >
                  Website URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="submit-url"
                  type="url"
                  placeholder="https://yoursite.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="border-[#E5E7EB] focus:border-[#006AFF] focus:ring-[#006AFF]/20"
                  data-ocid="submit.url.input"
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="submit-title"
                  className="text-sm font-medium text-[#374151]"
                >
                  Site Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="submit-title"
                  placeholder="My Awesome Site"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="border-[#E5E7EB] focus:border-[#006AFF] focus:ring-[#006AFF]/20"
                  data-ocid="submit.title.input"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="submit-desc"
                  className="text-sm font-medium text-[#374151]"
                >
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="submit-desc"
                  placeholder="A brief description of what your site is about…"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="border-[#E5E7EB] focus:border-[#006AFF] focus:ring-[#006AFF]/20 resize-none"
                  data-ocid="submit.description.textarea"
                />
              </div>

              {/* Keywords */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="submit-keywords"
                  className="text-sm font-medium text-[#374151]"
                >
                  Keywords{" "}
                  <span className="text-[#9CA3AF] font-normal">(optional)</span>
                </Label>
                <Input
                  id="submit-keywords"
                  placeholder="technology, tools, productivity"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="border-[#E5E7EB] focus:border-[#006AFF] focus:ring-[#006AFF]/20"
                  data-ocid="submit.keywords.input"
                />
                <p className="text-xs text-[#9CA3AF]">
                  Comma-separated, max 20 keywords
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full bg-[#006AFF] hover:bg-[#0052CC] text-white font-semibold h-11 rounded-xl transition-colors"
                data-ocid="submit.submit_button"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit for Review"
                )}
              </Button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-[#E5E7EB]">
        <div className="flex items-center justify-center text-xs text-[#9CA3AF]">
          <p>
            © {new Date().getFullYear()}. Built with{" "}
            <span className="text-red-400">♥</span> using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#6B7280] transition-colors underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
