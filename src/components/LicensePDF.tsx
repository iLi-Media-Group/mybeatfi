import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

interface LicensePDFProps {
  license: {
    trackTitle: string;
    producerName: string;
    licenseeInfo: {
      name: string;
      email: string;
      company?: string;
    };
    licenseType: string;
    purchaseDate: string;
    expiryDate: string;
    price: number;
  };
  showCredits: boolean;
  acceptedDate: string;
}

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica'
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold'
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 10,
    fontFamily: 'Helvetica-Bold'
  },
  text: {
    marginBottom: 8,
    lineHeight: 1.5
  },
  partyInfo: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f5f5f5'
  },
  list: {
    marginLeft: 20,
    marginBottom: 8
  },
  listItem: {
    marginBottom: 5
  },
  signature: {
    marginTop: 40,
    borderTop: 1,
    paddingTop: 20
  }
});

export function LicensePDF({ license, showCredits, acceptedDate }: LicensePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Music Synchronization License Agreement</Text>

        <View style={styles.section}>
          <Text style={styles.text}>
            This Music Synchronization License Agreement ("Agreement") is entered into on{' '}
            {new Date(license.purchaseDate).toLocaleDateString()} by and between:
          </Text>

          <View style={styles.partyInfo}>
            <Text style={styles.text}>Licensor: MyBeatFi Sync</Text>
            <Text style={styles.text}>
              Licensee: {license.licenseeInfo.name}
              {license.licenseeInfo.company && ` (${license.licenseeInfo.company})`}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. GRANT OF LICENSE</Text>
          <Text style={styles.text}>
            Licensor hereby grants Licensee a non-exclusive, non-transferable license to synchronize
            and use the musical composition and sound recording titled "{license.trackTitle}" ("Music")
            for commercial purposes worldwide, subject to the terms and conditions stated herein.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. TERM OF LICENSE</Text>
          <Text style={styles.text}>
            The license commenced on {new Date(license.purchaseDate).toLocaleDateString()} and will
            expire on {new Date(license.expiryDate).toLocaleDateString()}.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. PERMITTED USES</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Online content (social media, websites, podcasts)</Text>
            <Text style={styles.listItem}>• Advertisements and promotional videos</Text>
            <Text style={styles.listItem}>• Film, TV, and video productions</Text>
            <Text style={styles.listItem}>• Video games and apps</Text>
            <Text style={styles.listItem}>• Live events and public performances</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. RESTRICTIONS</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Resell, sublicense, or distribute the Music as a standalone product</Text>
            <Text style={styles.listItem}>• Use the Music in a manner that is defamatory, obscene, or illegal</Text>
            <Text style={styles.listItem}>• Register the Music with any content identification system</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. COMPENSATION</Text>
          <Text style={styles.text}>
            Licensee has paid the amount of ${license.price.toFixed(2)} USD for this license.
          </Text>
        </View>

        {showCredits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. CREDITS</Text>
            <Text style={styles.text}>
              Licensee has opted to provide credit in the following format:
              "Music by {license.producerName}"
            </Text>
          </View>
        )}

        <View style={styles.signature}>
          <Text style={styles.text}>
            Agreement accepted electronically by {license.licenseeInfo.name} on{' '}
            {new Date(acceptedDate).toLocaleDateString()}
          </Text>
          <Text style={styles.text}>Email: {license.licenseeInfo.email}</Text>
        </View>
      </Page>
    </Document>
  );
}