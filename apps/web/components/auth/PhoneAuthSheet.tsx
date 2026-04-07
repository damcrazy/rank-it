"use client"

import { useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

type Step = "phone" | "otp"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after successful verification */
  onVerified: () => void
}

export function PhoneAuthSheet({ open, onOpenChange, onVerified }: Props) {
  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendOtp() {
    const supabase = getSupabaseBrowserClient()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setStep("otp")
  }

  async function verifyOtp() {
    const supabase = getSupabaseBrowserClient()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    onVerified()
    onOpenChange(false)
    // Reset state for next time
    setStep("phone")
    setPhone("")
    setOtp("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="border-b border-border/70 bg-card/85 px-6 py-5 backdrop-blur-sm">
          <DialogHeader className="gap-2 pr-10">
            <DialogTitle className="text-3xl font-semibold tracking-tight">Verify your number</DialogTitle>
            <DialogDescription>
              We use your phone number to prevent spam. One number = one voice on the board.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-6">
          {step === "phone" ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                  autoFocus
                  className="h-12 text-base"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={sendOtp} disabled={loading || phone.length < 8} size="lg" className="w-full">
                {loading ? "Sending…" : "Send OTP"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp">Enter the 6-digit code sent to {phone}</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                  autoFocus
                  className="h-12 text-base tracking-[0.24em]"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex flex-col gap-3">
                <Button onClick={verifyOtp} disabled={loading || otp.length !== 6} size="lg" className="w-full">
                  {loading ? "Verifying…" : "Verify & Continue"}
                </Button>
                <button
                  className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => { setStep("phone"); setOtp(""); setError(null) }}
                >
                  Use a different number
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
