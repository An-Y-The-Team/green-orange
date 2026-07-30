"use client";

import { useState } from "react";

import { ClientType } from "../../enums";
import type { ClientDetail, Contact } from "../../types";
import { ClientInfoCard } from "./components/client-info-card/client-info-card";
import { ContactsSection } from "./components/contacts-section/contacts-section";
import { IndividualAddress } from "./components/individual-address/individual-address";
import { LocationsSection } from "./components/locations-section/locations-section";

export function ClientDetailView({ client }: { client: ClientDetail }) {
  const isCompany = client.type === ClientType.COMPANY;
  // Contacts live at the parent so the location manager dropdown sees adds/edits.
  const [contacts, setContacts] = useState<Contact[]>(client.contacts);

  return (
    <div className="flex flex-col gap-4">
      <ClientInfoCard client={client} isCompany={isCompany} />
      {isCompany ? (
        <LocationsSection
          clientId={client.id}
          initial={client.locations}
          contacts={contacts}
        />
      ) : (
        <IndividualAddress
          clientId={client.id}
          location={client.locations[0]}
        />
      )}
      <ContactsSection
        clientId={client.id}
        contacts={contacts}
        setContacts={setContacts}
        isCompany={isCompany}
      />
    </div>
  );
}
