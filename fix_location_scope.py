import re

file_path = "apps/marketing/src/contexts/VowosDataContext.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# When we setActiveLocations, we should also initialize selectedLocationIds if it's currently empty or out of sync.
# Better yet, a useEffect that watches activeLocations
old_code = """  const [activeLocations, setActiveLocations] = useState<BoutiqueLocation[]>([]);
  const [staffMembers, setStaffMembers] = useState<string[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; amountCents: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLocation, setActiveLocation] = useState<LocationFilter>('all');
  const [selectedLocationIds, setSelectedLocationIds] = useState<LocationId[]>(
    activeLocations.map((location) => location.id),
  );"""

new_code = """  const [activeLocations, setActiveLocations] = useState<BoutiqueLocation[]>([]);
  const [staffMembers, setStaffMembers] = useState<string[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; amountCents: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLocation, setActiveLocation] = useState<LocationFilter>('all');
  const [selectedLocationIds, setSelectedLocationIds] = useState<LocationId[]>([]);

  useEffect(() => {
    if (activeLocations.length > 0 && selectedLocationIds.length === 0) {
      setSelectedLocationIds(activeLocations.map((location) => location.id));
    }
  }, [activeLocations]);"""

content = content.replace(old_code, new_code)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed selectedLocationIds sync")
