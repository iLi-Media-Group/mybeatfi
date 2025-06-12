import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

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
    price: number;
  };
  showCredits: boolean;
  acceptedDate: string;
}

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
  trackTitle: {
    fontSize: 18,
    marginBottom: 10,
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

const getLicenseDurationInfo = (licenseType: string, purchaseDate: string) => {
  const purchase = new Date(purchaseDate);
  let durationText = '';
  let expirationDate: string;

  switch (licenseType) {
    case 'Single Track':
    case 'Gold Access':
      purchase.setFullYear(purchase.getFullYear() + 1);
      expirationDate = purchase.toLocaleDateString();
      durationText = '1 year';
      break;
    case 'Platinum Access':
      purchase.setFullYear(purchase.getFullYear() + 3);
      expirationDate = purchase.toLocaleDateString();
      durationText = '3 years';
      break;
    case 'Ultimate Access':
      expirationDate = 'Perpetual (No Expiration)';
      durationText = 'Unlimited';
      break;
    default:
      purchase.setFullYear(purchase.getFullYear() + 1);
      expirationDate = purchase.toLocaleDateString();
      durationText = '1 year';
  }

  return { expirationDate, durationText };
};

export function LicensePDF({ license, showCredits, acceptedDate }: LicensePDFProps) {
  const { expirationDate, durationText } = getLicenseDurationInfo(license.licenseType, license.purchaseDate);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Music Synchronization License Agreement</Text>

        <Text style={styles.trackTitle}>"{license.trackTitle}"</Text>

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
          <Text style={styles.sectionTitle}>License Summary</Text>
          <Text style={styles.text}>Track: {license.trackTitle}</Text>
          <Text style={styles.text}>License Type: {license.licenseType}</Text>
          <Text style={styles.text}>Duration: {durationText}</Text>
          <Text style={styles.text}>Purchase Date: {new Date(license.purchaseDate).toLocaleDateString()}</Text>
          <Text style={styles.text}>Expiration Date: {expirationDate}</Text>
          <Text style={styles.text}>
            License Fee:{' '}
            {license.licenseType === 'Single Track'
              ? '$9.99 USD'
              : `Included with ${license.licenseType}`}
          </Text>
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
          <Text style={styles.sectionTitle}>2. PERMITTED USES</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Online content (social media, websites, podcasts)</Text>
            <Text style={styles.listItem}>• Advertisements and promotional videos</Text>
            <Text style={styles.listItem}>• Film, TV, and video productions</Text>
            <Text style={styles.listItem}>• Video games and apps</Text>
            <Text style={styles.listItem}>• Live events and public performances</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. RESTRICTIONS</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Resell, sublicense, or distribute the Music as a standalone product</Text>
            <Text style={styles.listItem}>• Use the Music in a manner that is defamatory, obscene, or illegal</Text>
            <Text style={styles.listItem}>• Register the Music with any content identification system</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. COMPENSATION</Text>
          <Text style={styles.text}>
            Licensee has paid the amount {' '}
            {license.licenseType === 'Single Track'
              ? '$9.99 USD to use this track'
              : `Included with ${license.licenseType} plan`}
          </Text>
        </View>

        {showCredits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. CREDITS</Text>
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
