-- This is an empty migration.
ALTER TABLE "Event" ADD CONSTRAINT "event_places_check"
    CHECK ("capacity" > 0 AND "seatsTaken" >= 0 AND "seatsTaken" <= "capacity");

ALTER TABLE "Event" ADD CONSTRAINT "event_prix_check"
    CHECK ("priceCents" > 0 AND ("studentPriceCents" IS NULL OR "studentPriceCents" >= 0));

ALTER TABLE "Event" ADD CONSTRAINT "event_date_check"
    CHECK ("startsAt" >= CURRENT_DATE);

ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_pourcentage_check"
    CHECK ("percentOff" BETWEEN 1 AND 100 AND "usedCount" >= 0 AND 
    "usedCount" <= "maxUses");
