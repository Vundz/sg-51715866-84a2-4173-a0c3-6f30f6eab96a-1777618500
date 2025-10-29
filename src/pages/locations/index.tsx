
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";
import { Location, Planting } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  useEffect(() => {
    setLocations(getStorageData<Location[]>(STORAGE_KEYS.LOCATIONS) || []);
    setPlantings(getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || []);
  }, []);

  const getLocationOccupancy = (locationId: string) => {
    return plantings
      .filter(p => p.locationId === locationId && p.status === 'active')
      .reduce((acc, p) => acc + p.quantity, 0);
  };

  const handleSaveLocation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const locationData: Omit<Location, 'id'> = {
      name: formData.get("name") as string,
      capacity: parseInt(formData.get("capacity") as string, 10),
    };

    const updatedLocations = editingLocation
      ? locations.map(loc => loc.id === editingLocation.id ? { ...loc, ...locationData } : loc)
      : [...locations, { ...locationData, id: generateId("loc") }];
    
    setLocations(updatedLocations);
    setStorageData(STORAGE_KEYS.LOCATIONS, updatedLocations);
    setIsDialogOpen(false);
    setEditingLocation(null);
  };

  const handleDeleteLocation = (id: string) => {
    if (!confirm("Are you sure you want to delete this location? This cannot be undone.")) return;
    const updatedLocations = locations.filter(loc => loc.id !== id);
    setLocations(updatedLocations);
    setStorageData(STORAGE_KEYS.LOCATIONS, updatedLocations);
  };

  const handleOpenDialog = (location: Location | null = null) => {
    setEditingLocation(location);
    setIsDialogOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <MapPin className="w-10 h-10 text-purple-600" />
            Locations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your greenhouses and nursery locations.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit" : "Add"} Location</DialogTitle>
            <DialogDescription>
              {editingLocation ? "Update the details of this location." : "Create a new location for your plantings."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveLocation} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name</Label>
              <Input id="name" name="name" defaultValue={editingLocation?.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" name="capacity" type="number" defaultValue={editingLocation?.capacity} required />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Nursery Locations</CardTitle>
          <CardDescription>A list of all your greenhouse locations and their capacity.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Occupancy / Capacity</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">No locations created yet.</TableCell>
                </TableRow>
              ) : (
                locations.map(location => {
                  const occupancy = getLocationOccupancy(location.id);
                  const utilization = location.capacity > 0 ? (occupancy / location.capacity) * 100 : 0;
                  return (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>{occupancy} / {location.capacity}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${utilization}%` }}></div>
                          </div>
                          <span className="text-sm font-medium">{utilization.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(location)}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteLocation(location.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
