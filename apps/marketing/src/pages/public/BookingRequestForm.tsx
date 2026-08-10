import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
import { Input } from '@vowos/design-system';
import { Label } from '@vowos/design-system';
import { Textarea } from '@vowos/design-system';

export default function BookingRequestForm() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">✨</span>
          </div>
          <CardTitle className="text-3xl font-serif">Request an Appointment</CardTitle>
          <CardDescription className="text-lg mt-2">
            Tell us what you're looking for, and we'll match you with the perfect stylist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" placeholder="Jane" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" placeholder="Doe" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="jane@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service">What are you looking for?</Label>
            <select id="service" className="w-full border rounded-md h-10 px-3 bg-background">
              <option>Bridal Consultation</option>
              <option>Alterations</option>
              <option>Accessory Styling</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="location">Preferred Location</Label>
              <select id="location" className="w-full border rounded-md h-10 px-3 bg-background">
                <option>Any Location</option>
                <option>Baton Rouge</option>
                <option>Covington</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeframe">Preferred Timeframe</Label>
              <select id="timeframe" className="w-full border rounded-md h-10 px-3 bg-background">
                <option>Next available</option>
                <option>Next week</option>
                <option>Next month</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Details (Optional)</Label>
            <Textarea id="notes" placeholder="Tell us about your wedding, dress style, budget..." className="min-h-[100px]" />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full text-lg h-12">Submit Request</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
