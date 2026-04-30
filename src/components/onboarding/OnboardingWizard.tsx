"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Target, TrendingUp, PiggyBank, ShieldCheck } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { withCsrfHeaders } from "@/lib/csrf";

export function OnboardingWizard() {
  const { hasCompletedOnboarding, profile, setProfileField, completeOnboarding } = useOnboardingStore();
  const { user, status } = useAuthStore();
  const [step, setStep] = useState(1);

  // Do not show if not authenticated or already completed
  if (status !== "authenticated" || !user || hasCompletedOnboarding) {
    return null;
  }

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => s - 1);

  const handleComplete = async () => {
    completeOnboarding();
    
    // Sync to Firestore memory API
    try {
      await fetch("/api/profile/memory", {
        method: "POST",
        headers: withCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          investmentGoals: profile.investmentGoal,
          amount: profile.availableAmount,
          preferredTenorMonths: profile.investmentHorizonMonths,
          seniorCitizen: profile.isSeniorCitizen,
        }),
      });
    } catch (err) {
      console.error("Failed to sync profile to memory:", err);
    }
  };

  const steps = [
    {
      id: 1,
      title: "What's your primary goal?",
      desc: "Help Nivesh Saathi understand what you want to achieve.",
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { id: "wealth_creation", label: "Wealth Creation", icon: TrendingUp },
            { id: "safe_returns", label: "Safe & Steady Returns", icon: ShieldCheck },
            { id: "tax_saving", label: "Tax Saving", icon: PiggyBank },
            { id: "emergency_fund", label: "Emergency Fund", icon: Target },
          ].map((goal) => {
            const isSelected = profile.investmentGoal === goal.id;
            return (
              <button
                key={goal.id}
                onClick={() => setProfileField("investmentGoal", goal.id)}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all ${
                  isSelected
                        ? "border-accent bg-accent/10 text-accent"
                    : "border-outline bg-input-bg text-text-muted hover:border-text-strong"
                }`}
              >
                <goal.icon className="w-8 h-8" />
                <span className="font-medium text-sm">{goal.label}</span>
              </button>
            );
          })}
        </div>
      ),
      isValid: !!profile.investmentGoal,
    },
    {
      id: 2,
      title: "How much are you looking to invest?",
      desc: "This helps us calculate exact maturity values.",
      content: (
        <div className="space-y-8 py-4">
          <div className="text-center">
            <motion.div
              key={profile.availableAmount || 50000}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-bold text-text-strong bg-clip-text text-transparent bg-gradient-to-r from-highlight to-emerald-500"
            >
              Rs {(profile.availableAmount || 50000).toLocaleString("en-IN")}
            </motion.div>
          </div>
          <Slider
            value={[profile.availableAmount || 50000]}
            min={10000}
            max={5000000}
            step={10000}
            onValueChange={(vals) => setProfileField("availableAmount", vals[0])}
                    className="[&_[role=slider]]:border-accent [&_[role=slider]]:bg-accent [&>.relative>.absolute]:bg-accent-hover"
          />
        </div>
      ),
      isValid: true,
    },
    {
      id: 3,
      title: "What's your time horizon?",
      desc: "How long can you keep the money invested?",
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { id: 6, label: "Short (6 Months)" },
            { id: 12, label: "Medium (1 Year)" },
            { id: 36, label: "Long (3 Years)" },
            { id: 60, label: "Very Long (5+ Years)" },
          ].map((horizon) => {
            const isSelected = profile.investmentHorizonMonths === horizon.id;
            return (
              <button
                key={horizon.id}
                onClick={() => setProfileField("investmentHorizonMonths", horizon.id)}
                className={`p-4 rounded-xl border text-center transition-all ${
                  isSelected
                        ? "border-accent bg-accent/10 text-accent"
                    : "border-outline bg-input-bg text-text-muted hover:border-text-strong"
                }`}
              >
                <span className="font-medium">{horizon.label}</span>
              </button>
            );
          })}
        </div>
      ),
      isValid: !!profile.investmentHorizonMonths,
    },
    {
      id: 4,
      title: "Are you a Senior Citizen?",
      desc: "Senior citizens (60+ years) get extra 0.5% - 0.75% interest.",
      content: (
        <div className="flex gap-4">
          <button
            onClick={() => setProfileField("isSeniorCitizen", true)}
            className={`flex-1 p-4 rounded-xl border text-center transition-all ${
              profile.isSeniorCitizen === true
                        ? "border-accent bg-accent/10 text-accent"
                : "border-outline bg-input-bg text-text-muted hover:border-text-strong"
            }`}
          >
            <span className="font-medium text-lg">Yes</span>
            <p className="text-xs mt-1 opacity-80">I am 60 or above</p>
          </button>
          <button
            onClick={() => setProfileField("isSeniorCitizen", false)}
            className={`flex-1 p-4 rounded-xl border text-center transition-all ${
              profile.isSeniorCitizen === false
                        ? "border-accent bg-accent/10 text-accent"
                : "border-outline bg-input-bg text-text-muted hover:border-text-strong"
            }`}
          >
            <span className="font-medium text-lg">No</span>
            <p className="text-xs mt-1 opacity-80">I am under 60</p>
          </button>
        </div>
      ),
      isValid: profile.isSeniorCitizen !== null,
    },
  ];

  const currentStep = steps[step - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <Card className="w-full max-w-lg overflow-hidden bg-panel shadow-2xl border-outline relative">
        <div className="h-1 w-full bg-surface-dark absolute top-0 left-0">
          <motion.div
                    className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${(step / steps.length) * 100}%` }}
          />
        </div>
        
        <CardHeader className="pt-8 pb-4">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CardTitle className="text-2xl text-text-strong">{currentStep.title}</CardTitle>
            <CardDescription className="text-text-muted mt-2">{currentStep.desc}</CardDescription>
          </motion.div>
        </CardHeader>
        
        <CardContent className="min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep.content}
            </motion.div>
          </AnimatePresence>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-outline pt-4 bg-input-bg/50">
          {step > 1 ? (
            <Button variant="outline" onClick={handlePrev} className="text-text-muted border-outline">
              Back
            </Button>
          ) : (
            <div />
          )}
          
          <Button
            onClick={step === steps.length ? handleComplete : handleNext}
            disabled={!currentStep.isValid}
                  className="min-w-[120px] bg-accent text-white hover:bg-accent-hover"
          >
            {step === steps.length ? (
              <>Finish <Check className="w-4 h-4 ml-2" /></>
            ) : (
              <>Next <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
