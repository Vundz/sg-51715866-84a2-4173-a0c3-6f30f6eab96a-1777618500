
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";
import { Location } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  useEffect(() => {
    setLocations(getStorageData<Location>(STORAGE_KEYS.LOCATIONS));
  }, []);

  const handleSaveLocation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const location: Location = editingLocation ? {
      ...editingLocation,
      name: formData.get("name") as string,
      greenhouse: formData.get("greenhouse") as string,
      section: formData.get("section") as string,
      capacity: Number(formData.get("capacity")),
      notes: formData.get("notes") as string
    } : {
      id: generateId(),
      name: formData.get("name") as string,
      greenhouse: formData.get("greenhouse") as string,
      section: formData.get("section") as string,
      capacity: Number(formData.get("capacity")),
      currentOccupancy: 0,
      notes: formData.get("notes") as string,
      createdAt: new Date().toISOString()
    };

    const updatedLocations = editingLocation
      ? locations.map(l => l.id === editingLocation.id ? location : l)
      : [...locations, location];
    
    setLocations(updatedLocations);
    setStorageData(STORAGE_KEYS.LOCATIONS, updatedLocations);
    setIsDialogOpen(false);
    setEditingLocation(null);
  };

  const handleDeleteLocation = (id: string) => {
    if (confirm("Are you sure you want to delete this location?")) {
      const updatedLocations = locations.filter(l => l.id !== id);
      setLocations(updatedLocations);
      setStorageData(STORAGE_KEYS.LOCATIONS, updatedLocations);
    }
  };

  const getOccupancyPercentage = (location: Location) => {
    return location.capacity > 0 ? Math.round((location.currentOccupancy / location.capacity) * 100) : 0;
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600 bg-red-50 dark:bg-red-950";
    if (percentage >= 70) return "text-amber-600 bg-amber-50 dark:bg-amber-950";
    return "text-green-600 bg-green-50 dark:bg-green-950";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <MapPin className="w-10 h-10 text-purple-600" />
            Greenhouse Locations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage greenhouse sections and planting locations
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingLocation(null)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLocation ? "Edit" : "Add New"} Location</DialogTitle>
              <DialogDescription>
                Enter the details for the greenhouse location
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Location Name *</Label>
                  <Input id="name" name="name" defaultValue={editingLocation?.name} required placeholder="e.g., Section A-1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greenhouse">Greenhouse *</Label>
                  <Input id="greenhouse" name="greenhouse" defaultValue={editingLocation?.greenhouse} required placeholder="e.g., Greenhouse 1" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Input id="section" name="section" defaultValue={editingLocation?.section} placeholder="e.g., North Wing" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity (units) *</Label>
                  <Input id="capacity" name="capacity" type="number" defaultValue={editingLocation?.capacity} required min="1" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={editingLocation?.notes} rows={3} placeholder="Additional information about this location" />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingLocation(null); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  {editingLocation ? "Update" : "Create"} Location
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{locations.length}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {locations.reduce((sum, loc) => sum + loc.capacity, 0)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">units</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Current Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {locations.reduce((sum, loc) => sum + loc.currentOccupancy, 0)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">units in use</p>
          </CardContent>
        </Card>
      </div>

      {locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Locations Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Add your first greenhouse location to get started</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Locations</CardTitle>
            <CardDescription>Manage your greenhouse locations and track capacity</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Greenhouse</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => {
                  const occupancyPct = getOccupancyPercentage(location);
                  return (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>{location.greenhouse}</TableCell>
                      <TableCell>{location.section || "-"}</TableCell>
                      <TableCell>{location.capacity} units</TableCell>
                      <TableCell>
                        {location.currentOccupancy} / {location.capacity}
                      </TableCell>
                      <TableCell>
                        <Badge className={getOccupancyColor(occupancyPct)}>
                          {occupancyPct}% Full
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingLocation(location);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteLocation(location.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
