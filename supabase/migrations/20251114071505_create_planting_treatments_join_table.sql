
CREATE TABLE planting_treatments (
    planting_id UUID NOT NULL,
    treatment_id UUID NOT NULL,
    PRIMARY KEY (planting_id, treatment_id),
    FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE,
    FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE CASCADE
);

ALTER TABLE public.planting_treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to planting_treatments"
ON public.planting_treatments
FOR ALL
USING (true)
WITH CHECK (true);
