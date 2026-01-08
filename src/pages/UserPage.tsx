import React, { useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { Avatar } from 'primereact/avatar';
import { Divider } from 'primereact/divider';
import { SupabaseService } from '../services/SupabaseService.ts';
import ModelGallery from './ModelGallery';
import { Badge } from 'primereact/badge';
import { CenteredSpinner } from '../components/CenteredSpinner.tsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';

import { useUserContext } from '../state/UseUserContext.tsx';

export default function UserPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const user = useUserContext();
  const navigate = useNavigate();

  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1];

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      if (!user.user) {
        setStats(null);
        setIsOwnProfile(false);
        setLoading(false);
        return;
      }
      const statsData = await SupabaseService.fetchUserStats(user.user.id);
      setStats(statsData);
      setIsOwnProfile(true); // Always true for own profile
      setLoading(false);
    };
    fetchStats();
  }, []);

  function getGalleryContent() {
    if (!stats?.username) return null;
    if (lastSegment === stats.username) {
      return <ModelGallery filter={{ author: stats.username }} />;
    } else if (lastSegment === 'liked') {
      return <ModelGallery filter={{ likedByUsername: stats.username }} />;
    } else if (lastSegment === 'commented') {
      return <ModelGallery filter={{ commentedByUsername: stats.username }} />;
    } else {
      return <ModelGallery filter={{ author: stats.username }} />;
    }
  }

  function handleDeleteAccount() {
    setShowDeleteDialog(true);
  }

  function handleConfirmDelete() {
    const doIt = async () => {
      // TODO deleting a user doesnt work yet and we dont get any error message from supabase...
      await SupabaseService.deleteUser(user.user?.id);
      await user.logout();
      setShowDeleteDialog(false);
      navigate('/');
    };
    doIt();
  }

  function handleCancelDelete() {
    setShowDeleteDialog(false);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
        <Card style={{ minWidth: 300, maxWidth: 400 }}>
          {loading ?
            <CenteredSpinner text="Loading user stats" />
          : stats ?
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Avatar image={stats.avatar_url} shape="circle" size="xlarge" />
              <h2 style={{ margin: 0 }}>{stats.username}</h2>
              <div>
                <a
                  href={`https://github.com/${stats.username}`}
                  className="p-button p-button-text"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="pi pi-github" style={{ marginRight: 4 }}></i>github.com/
                  {stats.username}
                </a>
              </div>
              <div>Joined: {stats.created_at}</div>
              <div>Last sign in: {stats.last_sign_in_at}</div>
              <Divider />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 12,
                  width: '100%',
                  flexWrap: 'wrap',
                }}
              >
                <a
                  href={'#/user/' + stats.username}
                  className="p-button p-button-outlined"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Models
                  <Badge value={stats.models_count} style={{ background: '#333' }}></Badge>
                </a>
                <a
                  href={'#/user/' + stats.username + '/liked'}
                  className="p-button p-button-outlined"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Likes
                  <Badge value={stats.likes_count} style={{ background: '#333' }}></Badge>
                </a>
                <a
                  href={'#/user/' + stats.username + '/commented'}
                  className="p-button p-button-outlined"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Comments
                  <Badge value={stats.comments_count} style={{ background: '#333' }}></Badge>
                </a>
              </div>
            </div>
          : <div>Could not load user profile.</div>}
        </Card>
        {/* {isOwnProfile && ( */}
        {/*    <Card style={{ minWidth: 300, maxWidth: 400 }}> */}
        {/*      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}> */}
        {/*<a href="#/download-data" className="p-button p-button-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>*/}
        {/*    <i className="pi pi-download" style={{ marginRight: 8 }}></i>*/}
        {/*    Download All Data*/}
        {/*</a>*/}
        {/* <Button */}
        {/*   label="Delete Account" */}
        {/*   icon="pi pi-trash" */}
        {/*   severity="danger" */}
        {/*   outlined */}
        {/*   style={{ width: '100%' }} */}
        {/*   onClick={handleDeleteAccount} */}
        {/* /> */}
        {/*   </div> */}
        {/* </Card> */}
        {/* )} */}
      </div>
      {getGalleryContent()}
      <Dialog
        header="Confirm Account Deletion"
        visible={showDeleteDialog}
        onHide={handleCancelDelete}
        modal
        closable={false}
        style={{ minWidth: 300, maxWidth: 600 }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              label="Cancel"
              icon="pi pi-times"
              severity="info"
              outlined
              onClick={handleCancelDelete}
            />
            <Button
              label="Delete"
              icon="pi pi-trash"
              severity="danger"
              outlined
              onClick={handleConfirmDelete}
            />
          </div>
        }
      >
        <div style={{ padding: 8 }}>
          <p>
            Are you sure you want to delete your account and all data associated with it (likes,
            comments, models)? This action cannot be undone.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
