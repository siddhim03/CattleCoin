import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Rancher() {
  const [tagId, setTagId] = React.useState("");
  const [breed, setBreed] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [healthNotes, setHealthNotes] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { tagId, breed, birthDate, weight, healthNotes };
    // For now just log — integrate with API as needed
    // eslint-disable-next-line no-console
    console.log("Rancher form submitted:", payload);
    alert("Cow data submitted (check console)");
    setTagId("");
    setBreed("");
    setBirthDate("");
    setWeight("");
    setHealthNotes("");
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Add / Update Cow</CardTitle>
          <CardDescription>Enter common cow details for ranch records.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tag ID</label>
              <Input value={tagId} onChange={(e) => setTagId(e.target.value)} placeholder="e.g. 12345" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Breed</label>
              <Input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Angus" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Birth Date</label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Weight (kg)</label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 450" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Health Notes</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                placeholder="Any notable health info, vaccinations, or remarks"
                rows={4}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Rancher;
